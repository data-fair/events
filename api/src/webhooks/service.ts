import { LocalizedEvent, Webhook, WebhookSubscription } from '../../../shared/types/index.ts'

import { nanoid } from 'nanoid'
import mongo from '../mongo.ts'

export const createWebhook = async (event: LocalizedEvent, webhookSubscription: WebhookSubscription) => {
  const webhook: Webhook = {
    _id: nanoid(),
    sender: webhookSubscription.sender,
    owner: webhookSubscription.owner,
    subscription: {
      _id: webhookSubscription._id,
      title: webhookSubscription.title
    },
    notification: {
      title: event.title,
      body: event.body,
      topic: event.topic,
      // url: event.url,
      date: event.date,
      extra: event.extra
    },
    status: 'waiting',
    nbAttempts: 0
  }
  await mongo.webhooks.insertOne(webhook)
}
