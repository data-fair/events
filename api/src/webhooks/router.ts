import type { Webhook } from '#shared/types/index.ts'
import type { Filter, Sort } from 'mongodb'

import { Router } from 'express'
import { asyncHandler, session, mongoPagination, httpError } from '@data-fair/lib/express/index.js'
import mongo from '#mongo'

const router = Router()
export default router

// Get the list of webhooks
router.get('', asyncHandler(async (req, res, next) => {
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
}))

router.post('/:id/_retry', asyncHandler(async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const webhook = await mongo.webhooks.findOneAndUpdate(
    { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id },
    { $set: { status: 'waiting', nbAttempts: 0 }, $unset: { nextAttempt: '' } },
    { returnDocument: 'after' })

  if (!webhook) throw httpError(404)
  res.send(webhook)
}))

router.post('/:id/_cancel', asyncHandler(async (req, res, next) => {
  const { user, account, accountRole } = await session.reqAuthenticated(req)
  if (!user.adminMode && accountRole !== 'admin') throw httpError(403, 'Only an admin can manage webhooks')

  const webhook = await mongo.webhooks.findOneAndUpdate(
    { _id: req.params.id, 'owner.type': account.type, 'owner.id': account.id },
    { $set: { status: 'cancelled' }, $unset: { nextAttempt: '' } },
    { returnDocument: 'after' })

  if (!webhook) throw httpError(404)
  res.send(webhook)
}))
