import { run } from '@data-fair/lib/node/test-runner.js'
import mongo from '@data-fair/lib/node/mongo.js'

// Before tests
process.env.SUPPRESS_NO_CONFIG_WARNING = '1'
process.env.NODE_CONFIG_DIR = 'api/config/'
console.log('Starting API server...')
const apiServer = await import('../api/src/server.ts')
await apiServer.start()

for (const name of ['notifications', 'subscriptions', 'events', 'webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
  await mongo.db.collection(name).deleteMany({})
}

// Run tests
await run('test-it')

// After tests
await apiServer.stop()
process.exit(0)
