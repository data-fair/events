import { resolve } from 'node:path'
import { errorHandler, createSiteMiddleware, createSpaMiddleware, session } from '@data-fair/lib-express/index.js'
import { reqLogFields } from '@data-fair/lib-express/req-log-context.js'
import log, { withLogContext } from '@data-fair/lib-node/log.js'
import { apiDocs } from '../contract/api-docs.ts'
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

// every line of a request carries the ip and the host
app.use((req, res, next) => withLogContext(reqLogFields(req), next))

// adds the actor to the log context, and refuses a broken session: mounted on the routes that read
// the session only, the public ones (ui-logs, api-docs, identities, the UI) must keep ignoring a broken
// cookie. The public route of the push router is declared before this middleware, in the router itself.
const sessionContext = session.middleware()

app.use('/api/events', sessionContext, eventsRouter)
app.use('/api/subscriptions', sessionContext, subscriptionsRouter)
app.use('/api/webhook-subscriptions', sessionContext, webhookSubscriptionsRouter)
app.use('/api/webhooks', sessionContext, webhooksRouter)
app.use('/api/notifications', sessionContext, notificationsRouter)
app.use('/api/push', pushRouter)
app.use('/api/identities', identitiesRouter)
app.use('/api/admin', sessionContext, adminRouter)
app.use('/api/ui-logs', uiLogsRouter)

// retro-compatibility with notify
app.use('/api/v1', (req, res, next) => {
  log.warn('the "/api/v1" prefix is deprecated', { code: 'deprecated', url: req.originalUrl.split('?')[0].slice(0, 1000) })
  next()
})
app.use('/api/v1/notifications', sessionContext, notificationsRouter)
app.use('/api/v1/subscriptions', sessionContext, subscriptionsRouter)

if (process.env.NODE_ENV === 'development') {
  app.delete('/api/test-env', async (req, res) => {
    const testFilter = /^test/
    for (const name of ['notifications', 'subscriptions']) {
      await eventsMongo.db.collection(name).deleteMany({ 'recipient.id': testFilter })
    }
    await eventsMongo.db.collection('events').deleteMany({ 'sender.id': testFilter })
    for (const name of ['webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
      await eventsMongo.db.collection(name).deleteMany({ 'owner.id': testFilter })
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

// public and the same for every caller, merged by data-fair with the documents of the other services
app.get('/api/api-docs.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300')
  res.vary('Accept-Language')
  res.json(apiDocs(req.acceptsLanguages('fr', 'en') === 'en' ? 'en' : 'fr'))
})

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
