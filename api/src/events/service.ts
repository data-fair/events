import type { Filter } from 'mongodb'
import type { Event, LocalizedEvent, Subscription, WebhookSubscription } from '#types'
import config from '#config'
import mongo from '#mongo'
import { sendNotification, prepareSubscriptionNotification } from '../notifications/service.ts'
import { createWebhook } from '../webhooks/service.ts'

const localizeProp = (prop: Event['title'], locale: string): string => {
  if (prop && typeof prop === 'object') return prop[locale] || prop[config.i18n.defaultLocale]
  return prop
}

export const localizeEvent = (event: Event, locale: string = config.i18n.defaultLocale): LocalizedEvent => {
  return {
    ...event,
    title: localizeProp(event.title, locale),
    body: event.body && localizeProp(event.body, locale),
    htmlBody: event.htmlBody && localizeProp(event.htmlBody, locale)
  }
}

export const receiveEvent = async (event: Event) => {
  // prepare the filter to find the topics matching this subscription
  const topicParts = event.topic.key.split(':')
  const topicKeys = topicParts.map((part, i) => topicParts.slice(0, i + 1).join(':'))
  const subscriptionsFilter: Filter<Subscription> = { 'topic.key': { $in: topicKeys } }
  if (event.visibility === 'private') subscriptionsFilter.visibility = 'private'
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
  for await (const subscription of mongo.subscriptions.find(subscriptionsFilter)) {
    await sendNotification(prepareSubscriptionNotification(event, subscription))
  }

  const webhookSubscriptionsFilter = subscriptionsFilter as Filter<WebhookSubscription>
  for await (const webhookSubscription of mongo.webhookSubscriptions.find(webhookSubscriptionsFilter)) {
    // TODO: store a locale on webhooks subscription ?
    await createWebhook(localizeEvent(event), webhookSubscription)
  }
}
