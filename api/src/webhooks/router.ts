import type { Webhook } from '#types'
import type { Filter, Sort } from 'mongodb'

import { Router } from 'express'
import { session, mongoPagination, httpError } from '@data-fair/lib-express/index.js'
import log from '@data-fair/lib-node/log.js'
import mongo from '#mongo'
import { emitWebhook } from './service.ts'
import { requireOperationScope } from '../shared/scopes.ts'
import { ownerLogFields } from '../shared/log-fields.ts'

const router = Router()
export default router

// Get the list of webhooks
router.get('', requireOperationScope('listWebhooks'), async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const sort: Sort = { 'notification.date': -1 }
  const { skip, size } = mongoPagination(req.query)

  const query: Filter<Webhook> = { 'owner.type': account.type, 'owner.id': account.id }
  if (req.query.subscription) query['subscription._id'] = req.query.subscription
  const resultsPromise = mongo.webhooks.find(query).limit(size).skip(skip).sort(sort).toArray()
  const countPromise = mongo.webhooks.countDocuments(query)
  const [results, count] = await Promise.all([resultsPromise, countPromise])
  res.json({ results, count })
})

router.post('/:id/_retry', requireOperationScope('retryWebhook'), async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const webhook = await mongo.webhooks.findOneAndUpdate(
    { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id },
    { $set: { status: 'waiting', nbAttempts: 0 }, $unset: { nextAttempt: '' } },
    { returnDocument: 'after' })

  if (!webhook) throw httpError(404)
  log.info('a webhook was retried', { code: 'events.webhooks.retry', webhookId: webhook._id, webhookSubscriptionId: webhook.subscription._id, ...ownerLogFields(account) })
  await emitWebhook(webhook)
  res.send(webhook)
})

router.post('/:id/_cancel', requireOperationScope('cancelWebhook'), async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const webhook = await mongo.webhooks.findOneAndUpdate(
    { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id },
    { $set: { status: 'cancelled' }, $unset: { nextAttempt: '' } },
    { returnDocument: 'after' })

  if (!webhook) throw httpError(404)
  log.info('a webhook was cancelled', { code: 'events.webhooks.cancel', webhookId: webhook._id, webhookSubscriptionId: webhook.subscription._id, ...ownerLogFields(account) })
  await emitWebhook(webhook)
  res.send(webhook)
})
