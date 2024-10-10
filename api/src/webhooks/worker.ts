// this single small worker loop doesn't rellay justify running in separate processes
// we simply run it as part of the api server

import config from '#config'
import dayjs from 'dayjs'
import Debug from 'debug'
import type { Webhook } from '#types'
import mongo from '#mongo'
import axios from '@data-fair/lib-node/axios.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import * as locks from '@data-fair/lib-node/locks.js'

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
    const date = new Date().toISOString()
    const subscription = await mongo.webhookSubscriptions
      .findOne({ _id: webhook.subscription._id, 'owner.type': webhook.owner.type, 'owner.id': webhook.owner.id })
    if (!subscription) {
      debug('missing subscription for webhook, store as error')
      await mongo.webhooks.updateOne({ _id: webhook._id }, {
        $set: {
          status: 'error',
          lastAttempt: { date, error: 'missing subscription' }
        },
        $unset: { nextAttempt: '' }
      })
      continue
    }
    debug('found matching subscription', subscription)
    try {
      const headers: Record<string, string> = {}
      if (subscription.header && subscription.header.key && subscription.header.value) {
        headers[subscription.header.key] = subscription.header.value
      }
      debug('send webhook', subscription.url, webhook.notification)
      const res = await axios.post(subscription.url, webhook.notification, { headers, timeout: 2000 })
      debug('webhook success')
      await mongo.webhooks.updateOne({ _id: webhook._id }, {
        $set: {
          status: 'ok',
          lastAttempt: { date, status: res.status }
        },
        $unset: { nextAttempt: '' },
        $inc: { nbAttempts: 1 }
      })
    } catch (err: any) {
      debug('webhook failed', err)
      const attempt: Webhook['lastAttempt'] = { date }
      if (err.status) attempt.status = err.status
      else attempt.error = err.message
      const patch: any = {
        $set: {
          status: 'error',
          lastAttempt: attempt
        },
        $inc: { nbAttempts: 1 }
      }
      if (webhook.nbAttempts >= 9) {
        debug('webhook failed 10 times, no more attempts')
        patch.$unset = { nextAttempt: '' }
      } else {
        patch.$set.nextAttempt = dayjs().add(Math.ceil(Math.pow(webhook.nbAttempts + 1, 2.5)), 'minute').toDate()
        debug('webhook failed, progressively backoff', patch.$set.nextAttempt)
      }
      await mongo.webhooks.updateOne({ _id: webhook._id }, patch)
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
