import type { Event, Subscription, Notification, WebhookSubscription, Webhook } from '../../shared/types/index.js'

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
    return mongo.db.collection<Event>('events')
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

  init = async () => {
    await mongo.connect(config.mongoUrl)
    await mongo.configure({
      events: {},
      subscriptions: {},
      notifications: {},
      'webhook-subscriptions': {},
      webhooks: {},
      pushSubscriptions: {}
    })
  }
}

const eventsMongo = new EventsMongo()

export default eventsMongo
