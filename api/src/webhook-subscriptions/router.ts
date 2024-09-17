import type { Filter } from 'mongodb'
import type { WebhookSubscription } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { session, mongoSort, mongoPagination, httpError } from '@data-fair/lib/express/index.js'
import mongo from '#mongo'
import doc from '#doc'
import { createWebhook } from '../webhooks/service.ts'

const router = Router()
export default router

// Get the list of subscriptions
router.get('', async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const sort = mongoSort(req.query.sort)
  const { skip, size } = mongoPagination(req.query)
  const query: Filter<WebhookSubscription> = {}
  query['owner.type'] = account.type
  query['owner.id'] = account.id

  if (req.query.sender === 'none') {
    query.sender = { $exists: false }
  } else if (req.query.sender && typeof req.query.sender === 'string') {
    query['sender.type'] = req.query.sender.split(':')[0]
    query['sender.id'] = req.query.sender.split(':')[1]
  }
  if (req.query.topic) {
    query['topic.key'] = req.query.topic
  }

  const [results, count] = await Promise.all([
    size > 0 ? mongo.webhookSubscriptions.find(query).limit(size).skip(skip).sort(sort).toArray() : Promise.resolve([]),
    mongo.webhookSubscriptions.countDocuments(query)
  ])
  res.json({ results, count })
})

// Create or update a subscription
router.post('', async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const { body } = doc.webhookSubscriptions.postReq.returnValid(req)
  const owner = account
  const date = new Date().toISOString()

  const webhookSubscription: WebhookSubscription = {
    _id: nanoid(),
    visibility: 'private',
    ...body,
    owner,
    created: { id: user.id, name: user.name, date },
    updated: { id: user.id, name: user.name, date },
  }

  if (body._id) {
    const existingWebhookSubscription = body._id && await mongo.webhookSubscriptions.findOne({ _id: body._id })
    if (!existingWebhookSubscription) throw httpError(404)
    webhookSubscription.created = existingWebhookSubscription.created
  }

  const sender = webhookSubscription.sender

  if (user.adminMode) {
    // super admin can do whatever he wants
  } else if (sender && sender.type === owner.type && sender.id === owner.id) {
    // account sends to himself, ok
  } else {
    // other cases are accepted, but the subscription will only receive notifications
    // with public visibility
    webhookSubscription.visibility = 'public'
  }

  await mongo.webhookSubscriptions.replaceOne({ _id: webhookSubscription._id }, webhookSubscription, { upsert: true })
  res.status(200).json(webhookSubscription)
})

router.delete('/:id', async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const filter = { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id }
  const subscription = await mongo.webhookSubscriptions
    .findOne(filter)
  if (!subscription) return res.status(404).send()
  await mongo.webhookSubscriptions.deleteOne(filter)
  res.status(204).send()
})

router.post('/:id/_test', async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const filter = { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id }
  const subscription = await mongo.webhookSubscriptions.findOne(filter)
  if (!subscription) return res.status(404).send()
  await createWebhook({
    _id: 'test-webhook',
    sender: subscription.sender,
    visibility: 'private',
    title: 'Test webhook',
    topic: { key: 'test', title: 'Test' },
    date: new Date().toISOString()
  }, subscription)
  res.status(204).send()
})
