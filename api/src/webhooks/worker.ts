// this single small worker loop doesn't rellay justify running in separate processes
// we simply run it as part of the api server

import config from '#config'
import Debug from 'debug'
import type { Webhook } from '#types'
import mongo from '#mongo'
import log from '@data-fair/lib-node/log.js'
import locks from '@data-fair/lib-node/locks.js'
import { failedAttemptPatch } from './operations.ts'
import { ownerLogFields, urlHost } from '../shared/log-fields.ts'
import { emitWebhook, postWebhook } from './service.ts'

const debug = Debug('webhooks-worker')

let loopPromise: Promise<void> | null = null
let stopped = false
let acquiredLock = false

const wait = () => new Promise(resolve => setTimeout(resolve, config.worker.loopInterval))

// one turn of the loop, answers false when there is nothing to do for now
const processNext = async () => {
  if (!acquiredLock) {
    acquiredLock = await locks.acquire('webhooks-loop')
    if (!acquiredLock) {
      debug('lock was not available, wait for interval', config.worker.loopInterval)
      return false
    }
    // only the holder of the lock works on webhooks: what is still working was interrupted, by a
    // restart in the middle of a delivery, and nothing would ever pick it up
    await mongo.webhooks.updateMany({ status: 'working' }, { $set: { status: 'waiting' } })
  }
  const webhook = (await mongo.webhooks.findOneAndUpdate({
    $or: [
      { status: 'waiting' },
      { status: 'error', nextAttempt: { $lt: new Date().toISOString() } }
    ]
  }, { $set: { status: 'working' } }, { returnDocument: 'after' }))
  if (!webhook) {
    debug('no webhook to process, wait for interval', config.worker.loopInterval)
    return false
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
    return true
  }
  // not the subscription itself: its header holds the secret of the target
  debug('found matching subscription', subscription._id)
  try {
    debug('send webhook', webhook.notification)
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
    debug('webhook failed', err.message)
    const attempt: Webhook['lastAttempt'] = { date }
    if (err.status) attempt.status = err.status
    else attempt.error = err.message
    const patch = failedAttemptPatch(webhook.nbAttempts, attempt)
    if (patch.$set.nextAttempt) {
      debug('webhook failed, progressively backoff', patch.$set.nextAttempt)
    } else {
      log.warn('a webhook failed for the last time, no more attempts', {
        code: 'webhook-abandoned',
        err,
        webhookId: webhook._id,
        webhookSubscriptionId: subscription._id,
        targetHost: urlHost(subscription.url),
        ...ownerLogFields(webhook.owner)
      })
    }
    await emitWebhook(await mongo.webhooks.findOneAndUpdate({ _id: webhook._id }, patch, { returnDocument: 'after' }))
  }
  return true
}

const loop = async () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!stopped) {
    try {
      if (!await processNext()) await wait()
    } catch (err) {
      // a failure of mongo must not end the deliveries, as in the search worker
      log.error('the webhooks loop failed', { code: 'webhooks-loop', err })
      await wait()
    }
  }
  if (acquiredLock) await locks.release('webhooks-loop')
}

export const start = () => {
  loopPromise = loop()
}

export const stop = async () => {
  stopped = true
  try {
    await loopPromise
  } catch (err) {
    log.error('the webhooks loop failed', { code: 'webhooks-loop', err })
  }
}
