import { resolve } from 'node:path'
import { errorHandler, createSiteMiddleware, createSpaMiddleware } from '@data-fair/lib-express/index.js'
import express from 'express'
import helmet from 'helmet'
import identitiesRouter from './identities/router.ts'
import eventsRouter from './events/router.ts'
import pushRouter from './push/router.ts'
import notificationsRouter from './notifications/router.ts'
import subscriptionsRouter from './subscriptions/router.ts'
import webhooksRouter from './webhooks/router.ts'
import webhookSubscriptionsRouter from './webhook-subscriptions/router.ts'
import uiLogsRouter from './ui-logs/router.ts'
import adminRouter from './admin/router.ts'
import { uiConfig } from '#config'
import { internalError } from '@data-fair/lib-node/observer.js'
import eventsMongo from './mongo.ts'

const app = express()
export default app

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      // very restrictive by default, index.html of the UI will have custom rules defined in createSpaMiddleware
      // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
      'frame-ancestors': ["'none'"],
      'default-src': ["'none'"]
    }
  }
}))

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')
app.use(express.json())

app.use('/api/ping', (req, res) => res.send('ok'))

app.use(createSiteMiddleware('events'))

app.use('/api/events', eventsRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/webhook-subscriptions', webhookSubscriptionsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/push', pushRouter)
app.use('/api/identities', identitiesRouter)
app.use('/api/admin', adminRouter)
app.use('/api/ui-logs', uiLogsRouter)

// retro-compatibility with notify
app.use('api/v1', (req, res, next) => {
  internalError('deprecated', '"/api/v1" prefix is deprecated')
  next()
})
app.use('/api/v1/notifications', notificationsRouter)
app.use('/api/v1/subscriptions', subscriptionsRouter)

if (process.env.NODE_ENV === 'development') {
  app.delete('/api/test-env', async (req, res) => {
    for (const name of ['notifications', 'subscriptions', 'events', 'webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
      await eventsMongo.db.collection(name).deleteMany({})
    }
    res.send()
  })
  app.post('/api/test-env/:collection', async (req, res) => {
    await eventsMongo.db.collection(req.params.collection).insertOne(req.body)
    res.send()
  })
  app.get('/api/test-env/:collection/:id', async (req, res) => {
    const doc = await eventsMongo.db.collection(req.params.collection).findOne({ _id: req.params.id as any })
    res.json(doc)
  })
}

app.use('/api', (req, res) => res.status(404).send('unknown api endpoint'))

app.use('/push-sw.js', (req, res, next) => {
  // helmet prevents the service worker from displaying notification properly
  res.set('Content-Security-Policy', "default-src 'self';style-src 'unsafe-inline';")
  next()
})
app.use(await createSpaMiddleware(resolve(import.meta.dirname, '../../ui/dist'), uiConfig, {
  csp: { nonce: true, header: true }
}))

app.use(errorHandler)
