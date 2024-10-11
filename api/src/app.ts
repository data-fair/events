import { resolve } from 'node:path'
import { errorHandler, createSiteMiddleware, createSpaMiddleware } from '@data-fair/lib-express/index.js'
import express from 'express'
import identitiesRouter from './identities/router.ts'
import eventsRouter from './events/router.ts'
import pushRouter from './push/router.ts'
import notificationsRouter from './notifications/router.ts'
import subscriptionsRouter from './subscriptions/router.ts'
import webhooksRouter from './webhooks/router.ts'
import webhookSubscriptionsRouter from './webhook-subscriptions/router.ts'
import { uiConfig } from '#config'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')
app.use(express.json())

app.use(createSiteMiddleware('events'))

app.use('/api/events', eventsRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/webhook-subscriptions', webhookSubscriptionsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/push', pushRouter)
app.use('/api/identities', identitiesRouter)

app.use(await createSpaMiddleware(resolve(import.meta.dirname, '../../ui/dist'), uiConfig))

app.use(errorHandler)
