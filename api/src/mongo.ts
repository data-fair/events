import type { Subscription, Notification, WebhookSubscription, Webhook, SearchableEvent } from '~/shared/types/index.ts'
import type { Pointer } from './types.ts'

import mongo from '@data-fair/lib/node/mongo.js'
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
    return mongo.db.collection<any>('pushSubscriptions')
  }

  get pointers () {
    return mongo.db.collection<Pointer>('pointers')
  }

  init = async () => {
    await mongo.connect(config.mongoUrl)
    // TODO: report index definitions from notify
    await mongo.configure({
      events: {
        'main-keys': [
          { 'sender.type': 1, 'sender.id': 1, date: -1, _search: 'text' },
          { default_language: 'french' }
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
        'main-keys': [
          { 'sender.type': 1, 'sender.id': 1, 'owner.type': 1, 'owner.id': 1, 'topic.key': 1 },
          { unique: true }
        ]
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
