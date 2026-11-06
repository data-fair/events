import type { Filter } from 'mongodb'
import type { WebhookSubscription } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { session, mongoSort, mongoPagination, httpError } from '@data-fair/lib-express/index.js'
import log from '@data-fair/lib-node/log.js'
import mongo from '#mongo'
import * as postReq from '#doc/webhook-subscriptions/post-req/index.ts'
import { createWebhook, postWebhook, webhookNotification } from '../webhooks/service.ts'
import { requireOperationScope } from '../shared/scopes.ts'
import { ownerLogFields, urlHost } from '../shared/log-fields.ts'

const router = Router()
export default router

// Get the list of subscriptions
router.get('', requireOperationScope('listWebhookSubscriptions'), async (req, res, next) => {
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
  // a comma-separated list of topic keys, as the subscribe-webhooks embed page receives them
  if (req.query.topic && typeof req.query.topic === 'string') {
    query['topic.key'] = { $in: req.query.topic.split(',') }
  }

  const [results, count] = await Promise.all([
    size > 0 ? mongo.webhookSubscriptions.find(query).limit(size).skip(skip).sort(sort).toArray() : Promise.resolve([]),
    mongo.webhookSubscriptions.countDocuments(query)
  ])
  res.json({ results, count })
})

// Create or update a subscription
router.post('', requireOperationScope('postWebhookSubscription'), async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const { body } = postReq.returnValid(req, { name: 'req' })
  const owner = account
  const date = new Date().toISOString()

  const webhookSubscription: WebhookSubscription = {
    _id: nanoid(),
    visibility: 'private',
    ...body,
    owner,
    created: { id: user.id, date },
    updated: { id: user.id, date },
  }

  if (body._id) {
    // updating a subscription of another account would take it over
    const existingWebhookSubscription = await mongo.webhookSubscriptions.findOne({ _id: body._id, 'owner.type': owner.type, 'owner.id': owner.id })
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
  // these send data of the account to an external url
  log.info('a webhook subscription was saved', {
    code: body._id ? 'events.webhook-subscriptions.update' : 'events.webhook-subscriptions.create',
    webhookSubscriptionId: webhookSubscription._id,
    targetHost: urlHost(webhookSubscription.url),
    topicKey: webhookSubscription.topic.key,
    ...ownerLogFields(owner)
  })
  res.status(200).json(webhookSubscription)
})

router.delete('/:id', requireOperationScope('deleteWebhookSubscription'), async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const filter = { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id }
  const subscription = await mongo.webhookSubscriptions
    .findOne(filter)
  if (!subscription) return res.status(404).send()
  await mongo.webhookSubscriptions.deleteOne(filter)
  log.info('a webhook subscription was deleted', {
    code: 'events.webhook-subscriptions.delete',
    webhookSubscriptionId: subscription._id,
    targetHost: urlHost(subscription.url),
    ...ownerLogFields(account)
  })
  res.status(204).send()
})

const testEvent = (sender: WebhookSubscription['sender']) => ({
  _id: 'test-webhook',
  sender: { ...sender, name: 'Test' },
  visibility: 'private' as const,
  title: 'Test webhook',
  topic: { key: 'test', title: 'Test' },
  date: new Date().toISOString()
})

// test a webhook subscription before saving it: the same test message, sent at once to the url of the form,
// the answer comes back in the response as there is no delivery history yet
router.post('/_test', requireOperationScope('testNewWebhookSubscription'), async (req, res, next) => {
  const { user, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const { body } = postReq.returnValid(req, { name: 'req' })
  // a call to a url of the form, sent at once: the only trace of what was tried
  log.info('a new webhook url was tested', { code: 'events.webhook-subscriptions.test', targetHost: urlHost(body.url) })
  try {
    const response = await postWebhook(body, webhookNotification(testEvent(body.sender)))
    res.json({ status: response.status })
  } catch (err: any) {
    res.json(err.status ? { status: err.status } : { error: err.message })
  }
})

router.post('/:id/_test', requireOperationScope('testWebhookSubscription'), async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const filter = { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id }
  const subscription = await mongo.webhookSubscriptions.findOne(filter)
  if (!subscription) return res.status(404).send()
  await createWebhook(testEvent(subscription.sender), subscription)
  res.status(204).send()
})
