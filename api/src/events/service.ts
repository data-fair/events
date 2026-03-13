import { MongoBulkWriteError, type Filter } from 'mongodb'
import type { Event, SearchableEvent, WebhookSubscription, Notification } from '#types'
import config from '#config'
import mongo from '#mongo'
import { prepareSubscriptionNotification } from '../notifications/operations.ts'
import { sendNotification } from '../notifications/service.ts'
import { createWebhook } from '../webhooks/service.ts'
import { nanoid } from 'nanoid'
import debugModule from 'debug'
import { localizeEvent, getSubscriptionsFilter, buildSearchTexts } from './operations.ts'

const debug = debugModule('events')

export { localizeEvent, getSubscriptionsFilter, cleanEvent } from './operations.ts'

export const postEvents = async (events: Event[]) => {
  const eventsBulkOp = mongo.events.initializeUnorderedBulkOp()
  const notifsBulkOp = mongo.notifications.initializeUnorderedBulkOp()
  const notifications: Notification[] = []

  for (const rawEvent of events) {
    debug('post event', rawEvent)
    const event: SearchableEvent = {
      _id: nanoid(),
      visibility: 'private',
      ...rawEvent,
      _search: []
    }
    event._search = buildSearchTexts(event, config.i18n.locales, config.i18n.defaultLocale)
    eventsBulkOp.insert(event)

    const subscriptionsFilter = getSubscriptionsFilter(event)

    debug('find matching subscriptions', subscriptionsFilter)
    for await (const subscription of mongo.subscriptions.find(subscriptionsFilter)) {
      const notification = prepareSubscriptionNotification(event, subscription, { notificationIcon: config.theme.notificationIcon }, config.i18n.defaultLocale, nanoid())
      debug('send notification to', notification.recipient.id)
      notifsBulkOp.insert(notification)
      notifications.push(notification)
    }

    const webhookSubscriptionsFilter = subscriptionsFilter as Filter<WebhookSubscription>
    for await (const webhookSubscription of mongo.webhookSubscriptions.find(webhookSubscriptionsFilter)) {
      // TODO: store a locale on webhooks subscription ?
      await createWebhook(localizeEvent(event, config.i18n.defaultLocale, config.i18n.defaultLocale), webhookSubscription)
    }
  }

  if (eventsBulkOp.length) {
    try {
      await eventsBulkOp.execute({})
    } catch (err) {
      // we ignore conflict error, meaning that the same event id can be sent twice without triggering a failure
      // but without being inserted twice either
      if (err instanceof MongoBulkWriteError) {
        const nonConflictError = err.result.getWriteErrors().find(e => e.code !== 11000)
        if (nonConflictError) throw err
      } else {
        throw err
      }
    }
  }

  const insertedNotifications: Notification[] = []
  if (notifsBulkOp.length) {
    try {
      const res = await notifsBulkOp.execute({})
      for (const id of Object.values(res.insertedIds)) {
        insertedNotifications.push(notifications.find(n => n._id === id)!)
      }
    } catch (err) {
      // we ignore conflict error, meaning that the same event id can be sent twice without triggering a failure
      // but without being inserted twice either
      if (err instanceof MongoBulkWriteError) {
        const nonConflictError = err.result.getWriteErrors().find(e => e.code !== 11000)
        if (nonConflictError) throw err
      } else {
        throw err
      }
    }
  }

  // insertion must be performed before, so that data is available on receiving a WS event
  for (const notification of insertedNotifications) {
    await sendNotification(notification, true)
  }
}
