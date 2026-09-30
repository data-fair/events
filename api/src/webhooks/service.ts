import type { LocalizedEvent, Webhook, WebhookSubscription } from '#types'

import { nanoid } from 'nanoid'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import mongo from '#mongo'
import { coalesceAction, type CoalesceTarget } from './operations.ts'

// the delivery history of a webhook subscription, listened to by its embed page to show progress live
export const webhooksChannel = (owner: Webhook['owner'], subscriptionId: string) =>
  `${owner.type}:${owner.id}:webhook-subscriptions/${subscriptionId}/webhooks`

export const emitWebhook = async (webhook: Webhook | null) => {
  if (webhook) await wsEmitter.emit(webhooksChannel(webhook.owner, webhook.subscription._id), webhook)
}

export const createWebhook = async (event: LocalizedEvent, webhookSubscription: WebhookSubscription, opts: { coalesce?: boolean } = {}) => {
  const notification: Webhook['notification'] = {
    title: event.title,
    body: event.body,
    topic: event.topic,
    // url: event.url,
    date: event.date,
    extra: event.extra
  }

  if (opts.coalesce) {
    const existing = await mongo.webhooks
      .find({ 'subscription._id': webhookSubscription._id, 'notification.topic.key': event.topic.key })
      .project<CoalesceTarget>({ _id: 1, status: 1, nextAttempt: 1 })
      .toArray()
    const action = coalesceAction(existing)
    if (action.type === 'update') {
      const update = action.resetStatus
        ? { $set: { notification, status: 'waiting' as const, nbAttempts: 0 }, $unset: { nextAttempt: '' as const, lastAttempt: '' as const } }
        : { $set: { notification } }
      // matching on the observed status: if the worker grabbed it meanwhile, fall through to an insert
      const updated = await mongo.webhooks.findOneAndUpdate({ _id: action._id, status: action.status }, update, { returnDocument: 'after' })
      if (updated) return emitWebhook(updated)
    }
  }

  const webhook: Webhook = {
    _id: nanoid(),
    sender: event.sender,
    owner: webhookSubscription.owner,
    subscription: {
      _id: webhookSubscription._id,
      title: webhookSubscription.title
    },
    notification,
    status: 'waiting',
    nbAttempts: 0
  }
  await mongo.webhooks.insertOne(webhook)
  await emitWebhook(webhook)
}
