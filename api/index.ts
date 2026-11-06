import log from '@data-fair/lib-node/log.js'
import { start, stop } from './src/server.ts'

start().then(() => {}, err => {
  log.error('failure while starting the service', { code: 'start-process', err })
  process.exit(1)
})

const shutdown = (signal: string) => {
  log.info('received a stop signal, shutting down gracefully...', { signal })
  stop().then(() => {
    log.info('shutting down now')
    process.exit()
  }, err => {
    log.error('failure while stopping the service', { code: 'stop-process', err })
    process.exit(1)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
