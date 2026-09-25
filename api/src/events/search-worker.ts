// Rebuilds the search texts of the events flagged by the identity webhooks (_needsSearch),
// so that simple-directory gets its response without waiting for the text index.
// Runs in the api server, like the webhooks worker.

import config from '#config'
import Debug from 'debug'
import mongo from '#mongo'
import { internalError } from '@data-fair/lib-node/observer.js'
import locks from '@data-fair/lib-node/locks.js'
import { buildSearchTexts } from './operations.ts'

const debug = Debug('search-worker')
const batchSize = 1000

let loopPromise: Promise<void> | null = null
let stopped = false
let acquiredLock = false

const wait = () => new Promise(resolve => setTimeout(resolve, config.worker.loopInterval))

const loop = async () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!stopped) {
    try {
      if (!acquiredLock) {
        acquiredLock = await locks.acquire('search-loop')
        if (!acquiredLock) { await wait(); continue }
      }
      const events = await mongo.events.find({ _needsSearch: { $exists: true } }).limit(batchSize).toArray()
      if (!events.length) { await wait(); continue }
      debug('rebuild the search texts of', events.length, 'events')
      await mongo.events.bulkWrite(events.map(event => ({
        updateOne: {
          // a newer rename flagged the event again in the meantime: skipped, picked up by the next batch
          filter: { _id: event._id, _needsSearch: event._needsSearch },
          update: { $set: { _search: buildSearchTexts(event, config.i18n.locales, config.i18n.defaultLocale) }, $unset: { _needsSearch: 1 } }
        }
      })), { ordered: false })
    } catch (err) {
      internalError('search-loop', err)
      await wait()
    }
  }
  if (acquiredLock) await locks.release('search-loop')
}

export const start = () => {
  loopPromise = loop()
}

export const stop = async () => {
  stopped = true
  await loopPromise
}
