import type { Subscription, Notification, WebhookSubscription, Webhook, SearchableEvent, DevicesPushSubscription } from '#types'
import type { Pointer } from './types.ts'

import mongo from '@data-fair/lib-node/mongo.js'
import config from './config.ts'

export class EventsMongo {
  get client () {
    return mongo.client
  }

  get db () {
    return mongo.db
  }

  get events () {
    return mongo.db.collection<SearchableEvent>('events')
  }

  get subscriptions () {
    return mongo.db.collection<Subscription>('subscriptions')
  }

  get notifications () {
    return mongo.db.collection<Notification>('notifications')
  }

  get webhookSubscriptions () {
    return mongo.db.collection<WebhookSubscription>('webhook-subscriptions')
  }

  get webhooks () {
    return mongo.db.collection<Webhook>('webhooks')
  }

  get pushSubscriptions () {
    return mongo.db.collection<DevicesPushSubscription>('pushSubscriptions')
  }

  get pointers () {
    return mongo.db.collection<Pointer>('pointers')
  }

  get secrets () {
    return mongo.db.collection<{ _id: string, data: any } >('secret')
  }

  init = async () => {
    await mongo.connect(config.mongoUrl)
    await mongo.configure({
      events: {
        'main-keys': [
          { 'sender.type': 1, 'sender.id': 1, '_search.text': 'text', date: -1 },
          { default_language: config.i18n.defaultLocale }
        ]
      },
      subscriptions: {
        'main-keys': [
          { 'sender.type': 1, 'sender.id': 1, 'sender.department': 1, 'sender.role': 1, 'recipient.id': 1, 'topic.key': 1 },
          { unique: true }
        ]
      },
      notifications: {
        'main-keys': { 'recipient.id': 1, date: -1 }
      },
      'webhook-subscriptions': {
        'main-keys': { 'sender.type': 1, 'sender.id': 1, 'owner.type': 1, 'owner.id': 1, 'topic.key': 1 }
      },
      webhooks: {
        'main-keys': { 'owner.type': 1, 'owner.id': 1, 'subscription._id': 1, 'notification.date': 1 },
        'loop-keys': { status: 1, nextAttempt: 1 }
      },
      pushSubscriptions: {
        'main-keys': [
          { 'owner.type': 1, 'owner.id': 1 },
          { unique: true }
        ]
      },
      pointers: {
        'main-keys': { 'recipient.id': 1 }
      }
    })
  }
}

const eventsMongo = new EventsMongo()

export default eventsMongo
