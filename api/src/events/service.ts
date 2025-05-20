import type { Filter } from 'mongodb'
import type { Event, FullEvent, SearchableEvent, LocalizedEvent, Subscription, WebhookSubscription, Notification } from '#types'
import config from '#config'
import mongo from '#mongo'
import { sendNotification, prepareSubscriptionNotification } from '../notifications/service.ts'
import { createWebhook } from '../webhooks/service.ts'
import { nanoid } from 'nanoid'
import debugModule from 'debug'
import { type SessionStateAuthenticated } from '@data-fair/lib-express'

const debug = debugModule('events')

const localizeProp = (prop: Event['title'], locale: string): string => {
  if (prop && typeof prop === 'object') return prop[locale] || prop[config.i18n.defaultLocale]
  return prop
}

export const localizeEvent = (event: FullEvent, locale: string = config.i18n.defaultLocale): LocalizedEvent => {
  return {
    ...event,
    title: localizeProp(event.title, locale),
    body: event.body && localizeProp(event.body, locale),
    htmlBody: event.htmlBody && localizeProp(event.htmlBody, locale)
  }
}

export const getSubscriptionsFilter = (event: Event): Filter<Subscription> => {
  const topicParts = event.topic.key.split(':')
  const topicKeys = topicParts.map((part, i) => topicParts.slice(0, i + 1).join(':'))
  const subscriptionsFilter: Filter<Subscription> = { 'topic.key': { $in: topicKeys } }
  if (event.subscribedRecipient) {
    subscriptionsFilter['recipient.id'] = event.subscribedRecipient.id
  } else if (event.visibility === 'private') {
    subscriptionsFilter.visibility = 'private'
  }
  if (event.sender) {
    subscriptionsFilter['sender.type'] = event.sender.type
    subscriptionsFilter['sender.id'] = event.sender.id
    if (event.sender.role) subscriptionsFilter['sender.role'] = event.sender.role
    if (event.sender.department) {
      if (event.sender.department !== '*') {
        subscriptionsFilter['sender.department'] = event.sender.department
      }
    } else {
      subscriptionsFilter['sender.department'] = { $exists: false }
    }
  } else {
    subscriptionsFilter.sender = { $exists: false }
  }

  return subscriptionsFilter
}

export const postEvents = async (events: Event[]) => {
  const eventsBulkOp = mongo.events.initializeUnorderedBulkOp()
  const notifsBulkOp = mongo.notifications.initializeUnorderedBulkOp()
  const notifications: Notification[] = []

  for (const rawEvent of events) {
    debug('post event', rawEvent)
    // this logic should work much better on a mongodb version that would support multi-language indexing
    // https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/specify-language-text-index/create-text-index-multiple-languages/
    const event: SearchableEvent = {
      ...rawEvent,
      _id: nanoid(),
      _search: [],
      visibility: rawEvent.visibility ?? 'private'
    }
    for (const locale of config.i18n.locales) {
      const localizedEvent = localizeEvent(event, locale)
      const searchParts: (string | undefined)[] = [...event.topic.key.split(':'), event.topic.title, localizedEvent.title, localizedEvent.body, event.sender?.id, event.sender?.name]
      if (event.originator) {
        if (event.originator.organization) {
          searchParts.push(event.originator.organization.name, event.originator.organization.id)
        }
        if (event.originator.user && (!event.originator.organization || (event.sender?.type === 'organization' && event.sender.id === event.originator.organization.id))) {
          // do not add the user name if the originator is another organization
          searchParts.push(event.originator.user.name, event.originator.user.id)
        }
      }
      if (event) { event._search.push({ language: locale, text: searchParts.filter(Boolean).join(' ') }) }
    }
    eventsBulkOp.insert(event)

    const subscriptionsFilter = getSubscriptionsFilter(event)

    debug('find matching subscriptions', subscriptionsFilter)
    for await (const subscription of mongo.subscriptions.find(subscriptionsFilter)) {
      const notification = prepareSubscriptionNotification(event, subscription)
      debug('send notification to', notification.recipient.id)
      notifsBulkOp.insert(notification)
      notifications.push(notification)
    }

    const webhookSubscriptionsFilter = subscriptionsFilter as Filter<WebhookSubscription>
    for await (const webhookSubscription of mongo.webhookSubscriptions.find(webhookSubscriptionsFilter)) {
      // TODO: store a locale on webhooks subscription ?
      await createWebhook(localizeEvent(event), webhookSubscription)
    }
  }
  if (eventsBulkOp.length) await eventsBulkOp.execute()
  if (notifsBulkOp.length) await notifsBulkOp.execute()

  // insertion must be performed before, so that data is available on receiving a WS event
  for (const notification of notifications) {
    await sendNotification(notification, true)
  }
}

export const cleanEvent = (event: LocalizedEvent, sessionState: SessionStateAuthenticated) => {
  // hide the user if the event is sent from another organization
  if (event.originator) {
    if (sessionState.account.type === event.sender?.type && sessionState.account.id === event.sender.id) {
      if (event.originator.organization) {
        if (sessionState.organization?.id !== event.originator.organization.id) {
          delete event.originator.user
        }
      }
    }
  }

  // anonymize the user if the event is sent from a super admin
  if (event.originator?.user?.admin && !sessionState.user?.adminMode) {
    event.originator.user = { admin: true }
  }
  return event
}
