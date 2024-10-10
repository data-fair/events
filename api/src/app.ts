import { errorHandler } from '@data-fair/lib-express/index.js'
import express from 'express'
import identitiesRouter from './identities/router.ts'
import eventsRouter from './events/router.ts'
import pushRouter from './push/router.ts'
import notificationsRouter from './notifications/router.ts'
import subscriptionsRouter from './subscriptions/router.ts'
import webhooksRouter from './webhooks/router.ts'
import webhookSubscriptionsRouter from './webhook-subscriptions/router.ts'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')

app.set('json spaces', 2)
app.use(express.json())

app.use('/events/api/v1/events', eventsRouter)
app.use('/events/api/v1/subscriptions', subscriptionsRouter)
app.use('/events/api/v1/webhook-subscriptions', webhookSubscriptionsRouter)
app.use('/events/api/v1/webhooks', webhooksRouter)
app.use('/events/api/v1/notifications', notificationsRouter)
app.use('/events/api/v1/push', pushRouter)
app.use('/events/api/v1/identities', identitiesRouter)

app.use(errorHandler)
