import type { Subscription } from '#types'
import type { Filter } from 'mongodb'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { session, mongoSort, mongoPagination, httpError, reqSiteUrl } from '@data-fair/lib-express/index.js'
import log from '@data-fair/lib-node/log.js'
import mongo from '#mongo'
import * as postReq from '#doc/subscriptions/post-req/index.ts'
import { canSubscribePrivate, subscriptionLocale } from './operations.ts'
import { requireOperationScope } from '../shared/scopes.ts'

const router = Router()
export default router

// Get the list of subscriptions
router.get('', requireOperationScope('listSubscriptions'), async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const sort = mongoSort(req.query.sort)
  const { skip, size } = mongoPagination(req.query)

  const recipient = req.query.recipient || user.id
  if (recipient !== user.id && !user.adminMode) {
    throw httpError(403, 'You can only filter on recipient with your own id')
  }

  const query: Filter<Subscription> = {}
  query['recipient.id'] = recipient
  // noSender/senderType/senderId are deprecated and shoud be replaced by simply sender
  if (req.query.noSender) {
    throw httpError(400, 'noSender was deprecated')
  } else if (req.query.senderType && req.query.senderId) {
    throw httpError(400, 'senderType and senderId were deprecated')
  }

  if (req.query.sender === 'none') {
    query.sender = { $exists: false }
  } else if (req.query.sender && typeof req.query.sender === 'string') {
    const senderParts = req.query.sender.split(':')
    query['sender.type'] = senderParts[0]
    query['sender.id'] = senderParts[1]
    // type:id matches every department, type:id: and type:id:- only the subscriptions without one
    // (the subscribe page always serializes 3 parts, it must not take over a '*' or a departmental subscription)
    if (senderParts[2] && senderParts[2] !== '-') query['sender.department'] = senderParts[2]
    else if (senderParts.length > 2) query['sender.department'] = { $in: [null, ''] }
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

// Create or update a subscription
router.post('', requireOperationScope('postSubscription'), async (req, res, next) => {
  const { user, lang } = await session.reqAuthenticated(req)

  const { body } = postReq.returnValid(req, { name: 'req' })
  const date = new Date().toISOString()

  const subscription: Subscription = {
    _id: body._id ?? nanoid(),
    outputs: [],
    recipient: { id: user.id, name: user.name },
    title: `${body.topic.title} (${body.recipient?.name ?? user.name})`,
    visibility: 'private',
    ...body,
    origin: reqSiteUrl(req),
    created: { id: user.id, date },
    updated: { id: user.id, date }
  }

  if (subscription.recipient.id !== user.id && !user.adminMode) {
    throw httpError(403, 'Cannot create a subscription for another user')
  }

  let existingLocale: Subscription['locale']
  if (body._id) {
    const existingSubscription = await mongo.subscriptions.findOne({ _id: body._id })
    if (!existingSubscription) throw httpError(404)
    // updating a subscription of another user would take it over
    if (!user.adminMode && existingSubscription.recipient.id !== user.id) {
      throw httpError(403, 'Cannot update a subscription of another user')
    }
    existingLocale = existingSubscription.locale
    subscription.created = existingSubscription.created
    // the links of the notifications are built on this site, editing the outputs from another site
    // (the subscriptions page of the back-office for a portal subscription) must not move them
    subscription.origin = existingSubscription.origin ?? subscription.origin
  }

  // the session language is the recipient's only when they are the caller, not an admin acting for them
  const locale = subscriptionLocale(body.locale, existingLocale, subscription.recipient.id === user.id ? lang : undefined)
  if (locale) subscription.locale = locale

  if (!canSubscribePrivate(body.sender, user)) {
    subscription.visibility = 'public'
  }

  await mongo.subscriptions.replaceOne({ _id: subscription._id }, subscription, { upsert: true })
  // the private ones reach what the sender keeps for its members, an admin can act for another user
  log.info('a subscription was saved', {
    code: body._id ? 'events.subscriptions.update' : 'events.subscriptions.create',
    subscriptionId: subscription._id,
    recipientId: subscription.recipient.id,
    topicKey: subscription.topic.key,
    visibility: subscription.visibility
  })

  res.status(200).json(subscription)
})

router.get('/:id', requireOperationScope('getSubscription'), async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const subscription = await mongo.subscriptions.findOne({ _id: req.params.id })
  if (!subscription) throw httpError(404)

  // both the sender and the recipient can create/modify a subscription
  if (!user.adminMode && subscription.recipient.id !== user.id) {
    throw httpError(403, 'Cannot read a subscription of another user')
  }

  res.send(subscription)
})

router.delete('/:id', requireOperationScope('deleteSubscription'), async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const subscription = await mongo.subscriptions.findOne({ _id: req.params.id })
  if (!subscription) return res.status(204).send()

  // both the sender and the recipient can create/modify a subscription
  if (!user.adminMode && subscription.recipient.id !== user.id) {
    throw httpError(403, 'Cannot delete a subscription of another user')
  }

  await mongo.subscriptions.deleteOne({ _id: subscription._id })
  log.info('a subscription was deleted', { code: 'events.subscriptions.delete', subscriptionId: subscription._id, recipientId: subscription.recipient.id })
  res.status(204).send()
})
