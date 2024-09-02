import http from 'http'
import { session } from '@data-fair/lib/express/index.js'
import { startObserver, stopObserver } from '@data-fair/lib/node/observer.js'
import * as locks from '@data-fair/lib/node/locks.js'
import mongo from './mongo.ts'
import { createHttpTerminator } from 'http-terminator'
import { app } from './app.ts'
import config from './config.ts'
import * as webhooksWorker from './webhooks-worker.ts'

const server = http.createServer(app)
const httpTerminator = createHttpTerminator({ server })

// cf https://connectreport.com/blog/tuning-http-keep-alive-in-node-js/
// timeout is often 60s on the reverse proxy, better to a have a longer one here
// so that interruption is managed downstream instead of here
server.keepAliveTimeout = (60 * 1000) + 1000
server.headersTimeout = (60 * 1000) + 2000

export const start = async () => {
  if (config.observer.active) await startObserver(config.observer.port)
  session.init(config.privateDirectoryUrl)
  await mongo.init()
  await locks.init(mongo.db)
  await webhooksWorker.start(mongo.db)

  server.listen(config.port)
  await new Promise(resolve => server.once('listening', resolve))

  console.log(`
API server listening on port ${config.port}
API available at ${config.origin}/events/api/
UI available at ${config.origin}/events/`)
}

export const stop = async () => {
  await httpTerminator.terminate()
  await webhooksWorker.stop()
  if (config.observer.active) await stopObserver()
  await mongo.client.close()
}
