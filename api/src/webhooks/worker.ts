// this single small worker loop doesn't rellay justify running in separate processes
// we simply run it as part of the api server

import config from '#config'
import Debug from 'debug'
import type { Webhook } from '#types'
import mongo from '#mongo'
import { internalError } from '@data-fair/lib-node/observer.js'
import locks from '@data-fair/lib-node/locks.js'
import { failedAttemptPatch } from './operations.ts'
import { emitWebhook, postWebhook } from './service.ts'

const debug = Debug('webhooks-worker')

let loopPromise: Promise<void> | null = null
let stopped = false
let acquiredLock = false

const loop = async () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!stopped) {
    if (!acquiredLock) {
      acquiredLock = await locks.acquire('webhooks-loop')
      if (!acquiredLock) {
        debug('lock was not available, wait for interval', config.worker.loopInterval)
        await new Promise(resolve => setTimeout(resolve, config.worker.loopInterval))
        continue
      }
    }
    const webhook = (await mongo.webhooks.findOneAndUpdate({
      $or: [
        { status: 'waiting' },
        { status: 'error', nextAttempt: { $lt: new Date().toISOString() } }
      ]
    }, { $set: { status: 'working' } }, { returnDocument: 'after' }))
    if (!webhook) {
      debug('no webhook to process, wait for interval', config.worker.loopInterval)
      await new Promise(resolve => setTimeout(resolve, config.worker.loopInterval))
      continue
    }
    debug('work on webhook', webhook)
    await emitWebhook(webhook)
    const date = new Date().toISOString()
    const subscription = await mongo.webhookSubscriptions
      .findOne({ _id: webhook.subscription._id, 'owner.type': webhook.owner.type, 'owner.id': webhook.owner.id })
    if (!subscription) {
      debug('missing subscription for webhook, store as error')
      await emitWebhook(await mongo.webhooks.findOneAndUpdate({ _id: webhook._id }, {
        $set: {
          status: 'error',
          lastAttempt: { date, error: 'missing subscription' }
        },
        $unset: { nextAttempt: '' }
      }, { returnDocument: 'after' }))
      continue
    }
    debug('found matching subscription', subscription)
    try {
      debug('send webhook', subscription.url, webhook.notification)
      const res = await postWebhook(subscription, webhook.notification)
      debug('webhook success')
      await emitWebhook(await mongo.webhooks.findOneAndUpdate({ _id: webhook._id }, {
        $set: {
          status: 'ok',
          lastAttempt: { date, status: res.status }
        },
        $unset: { nextAttempt: '' },
        $inc: { nbAttempts: 1 }
      }, { returnDocument: 'after' }))
    } catch (err: any) {
      debug('webhook failed', err)
      const attempt: Webhook['lastAttempt'] = { date }
      if (err.status) attempt.status = err.status
      else attempt.error = err.message
      const patch = failedAttemptPatch(webhook.nbAttempts, attempt)
      debug('webhook failed', patch.$set.nextAttempt ? 'progressively backoff ' + patch.$set.nextAttempt : 'for the 10th time, no more attempts')
      await emitWebhook(await mongo.webhooks.findOneAndUpdate({ _id: webhook._id }, patch, { returnDocument: 'after' }))
    }
  }
  await locks.release('webhooks-loop')
}

export const start = () => {
  loopPromise = loop()
}

export const stop = async () => {
  stopped = true
  try {
    await loopPromise
  } catch (err) {
    internalError('webhooks-loop', err)
  }
}
