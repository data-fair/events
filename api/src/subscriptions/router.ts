import type { Subscription } from '#types'
import type { Filter } from 'mongodb'
import type { User } from '@data-fair/lib-express/index.js'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { session, mongoSort, mongoPagination, httpError, reqSiteUrl } from '@data-fair/lib-express/index.js'
import mongo from '#mongo'
import * as postReq from '#doc/subscriptions/post-req/index.ts'

const router = Router()
export default router

// Get the list of subscriptions
router.get('', async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const sort = mongoSort(req.query.sort)
  const { skip, size } = mongoPagination(req.query)

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
})

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
router.post('', async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const { body } = postReq.returnValid(req, { name: 'req' })
  const date = new Date().toISOString()

  const subscription: Subscription = {
    _id: nanoid(),
    outputs: [],
    recipient: { id: user.id, name: user.name },
    title: `${body.topic.title} (${body.recipient?.name ?? user.name})`,
    visibility: 'private',
    ...body,
    origin: reqSiteUrl(req),
    created: { id: user.id, name: user.name, date },
    updated: { id: user.id, name: user.name, date }
  }

  if (subscription.recipient.id !== user.id && !user.adminMode) {
    throw httpError(403, 'Impossible de créer un abonnement pour un autre utilisateur')
  }

  if (body._id) {
    const existingSubscription = await mongo.subscriptions.findOne({ _id: body._id })
    if (!existingSubscription) throw httpError(404)
    subscription.created = existingSubscription.created
  }

  if (!canSubscribePrivate(body.sender, user)) {
    subscription.visibility = 'public'
  }

  await mongo.subscriptions.replaceOne({ _id: subscription._id }, subscription, { upsert: true })

  res.status(200).json(subscription)
})

router.get('/:id', async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const subscription = await mongo.subscriptions.findOne({ _id: req.params.id })
  if (!subscription) throw httpError(404)

  // both the sender and the recipient can create/modify a subscription
  if (!user.adminMode && subscription.recipient.id !== user.id) {
    throw httpError(403, 'Impossible de lire un abonnement pour un autre utilisateur')
  }

  res.send(subscription)
})

router.delete('/:id', async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const subscription = await mongo.subscriptions.findOne({ _id: req.params.id })
  if (!subscription) return res.status(204).send()

  // both the sender and the recipient can create/modify a subscription
  if (!user.adminMode && subscription.recipient.id !== user.id) {
    throw httpError(403, 'Impossible de supprimer un abonnement pour un autre utilisateur')
  }

  await mongo.subscriptions.deleteOne({ _id: subscription._id })
  res.status(204).send()
})
