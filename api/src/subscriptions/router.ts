import type { Subscription } from '../../../shared/types/subscription/index.js'
import type { Filter } from 'mongodb'
import type { User } from '@data-fair/lib/express/index.js'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { session, asyncHandler, mongoSort, mongoPagination, httpError } from '@data-fair/lib/express/index.js'
import mongo from '../mongo.ts'
import * as postReq from './post-req/index.js'
import * as subscriptionType from '../../../shared/types/subscription/index.js'

const router = Router()

// Get the list of subscriptions
router.get('', asyncHandler(async (req, res, next) => {
  const sort = mongoSort(req.query.sort)
  const { skip, size } = mongoPagination(req.query)

  const { user } = await session.reqAuthenticated(req)

  const recipient = req.query.recipient || user.id
  if (recipient !== user.id && !user.adminMode) {
    throw httpError(403, 'You can only filter on recipient with your own id')
  }

  const query: Filter<Subscription> = {}
  query['recipient.id'] = recipient
  // noSender/senderType/senderId are kept for compatibility but shoud be replace by simply sender
  if (req.query.noSender) {
    throw httpError(400, 'noSender was deprecated')
  } else if (req.query.senderType && req.query.senderId) {
    throw httpError(400, 'senderType and senderId were deprecated')
  } else if (req.query.sender && typeof req.query.sender === 'string') {
    const senderParts = req.query.sender.split(':')
    query['sender.type'] = senderParts[0]
    query['sender.id'] = senderParts[1]
    if (senderParts[2]) query['sender.department'] = senderParts[2]
    if (senderParts[3]) query['sender.role'] = senderParts[3]
  }
  if (req.query.topic) {
    query['topic.key'] = req.query.topic
  }

  const [results, count] = await Promise.all([
    size > 0 ? mongo.subscriptions.find(query).limit(size).skip(skip).sort(sort).toArray() : Promise.resolve([]),
    mongo.subscriptions.countDocuments(query)
  ])
  res.json({ results, count })
}))

const canSubscribePrivate = (sender: Subscription['sender'], user: User) => {
  // super admin can do whatever he wants
  if (user.adminMode) return true
  if (!sender) return false

  // user sends to himself ?
  if (sender.type === 'user') return sender.id === user.id

  if (sender.type === 'organization') {
    let userOrg = user.organizations.find(o => o.id === sender.id && !o.department)
    if (sender.department) {
      userOrg = user.organizations.find(o => o.id === sender.id && o.department === sender.department) || userOrg
    }
    if (!userOrg) return false
    if (sender.role && sender.role !== userOrg.role && userOrg.role !== 'admin') return false
    return true
  }
}

// Create or update a subscription
router.post('', asyncHandler(async (req, res, next) => {
  const db = req.app.get('db')

  const { body } = postReq.returnValid(req)

  const { user } = await session.reqAuthenticated(req)

  const subscription = body as Partial<Subscription>

  subscription.recipient = body.recipient || { id: user.id, name: user.name }
  if (subscription.recipient.id !== user.id && !user.adminMode) {
    throw httpError(403, 'Impossible de créer un abonnement pour un autre utilisateur')
  }

  subscription.title = body.title || `${body.topic.title} (${subscription.recipient.name})`
  const existingSubscription = body._id && await db.collection('subscriptions').findOne({ _id: body._id })
  subscription._id = body._id || nanoid()
  subscription.updated = { id: user.id, name: user.name, date: new Date().toISOString() }
  subscription.created = existingSubscription ? existingSubscription.created : subscription.updated

  const sender = body.sender

  subscription.visibility = body.visibility || 'private'
  if (!canSubscribePrivate(sender, user)) {
    // other cases are accepted, but the subscription will only receive notifications
    // with public visibility
    subscription.visibility = 'public'
  }

  subscriptionType.assertValid(subscription)

  await mongo.subscriptions.replaceOne({ _id: subscription._id }, subscription, { upsert: true })

  res.status(200).json(subscription)
}))

router.get('/:id', asyncHandler(async (req, res, next) => {
  const subscription = await mongo.subscriptions.findOne({ _id: req.params.id })
  if (!subscription) throw httpError(404)

  const { user } = await session.reqAuthenticated(req)
  // both the sender and the recipient can create/modify a subscription
  if (!user.adminMode && subscription.recipient.id !== user.id) {
    throw httpError(403, 'Impossible de lire un abonnement pour un autre utilisateur')
  }

  res.send(subscription)
}))

router.delete('/:id', asyncHandler(async (req, res, next) => {
  const subscription = await mongo.subscriptions.findOne({ _id: req.params.id })
  if (!subscription) return res.status(204).send()

  const { user } = await session.reqAuthenticated(req)
  // both the sender and the recipient can create/modify a subscription
  if (!user.adminMode && subscription.recipient.id !== user.id) {
    throw httpError(403, 'Impossible de supprimer un abonnement pour un autre utilisateur')
  }

  await mongo.subscriptions.deleteOne({ _id: subscription._id })
  res.status(204).send()
}))

module.exports = router
