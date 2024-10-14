import type { SortDirection } from 'mongodb'
import type { Pointer } from '../types.ts'
import type { Notification, Event } from '#types'

import { nanoid } from 'nanoid'
import { Router } from 'express'
import mongo from '#mongo'
import config from '#config'
import { session, mongoPagination, httpError, assertReqInternal } from '@data-fair/lib-express/index.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import * as eventsPostReq from '#doc/events/post-req/index.ts'
import * as notificationsPostReq from '#doc/notifications/post-req/index.ts'
import { postEvent } from '../events/service.ts'

const router = Router()

// Get the list of notifications
router.get('', async (req, res, next) => {
  const { user } = await session.reqAuthenticated(req)

  const sort = { date: -1 as SortDirection }
  const { skip, size } = mongoPagination(req.query)
  const query = { 'recipient.id': user.id }
  let pointer: Pointer | null, results: Notification[], countNew: number
  if (size > 0) {
    pointer = await mongo.pointers
      .findOneAndReplace({ 'recipient.id': user.id }, { recipient: { id: user.id, name: user.name }, date: new Date().toISOString() }, { returnDocument: 'before', upsert: true })
    results = await mongo.notifications.find(query).limit(size).skip(skip).sort(sort).toArray()
  } else {
    pointer = await mongo.pointers.findOne({ 'recipient.id': user.id })
    results = []
  }
  if (pointer) {
    countNew = await mongo.notifications.countDocuments({ ...query, date: { $gt: pointer.date } })
  } else {
    countNew = await mongo.notifications.countDocuments(query)
  }

  results.forEach(notif => {
    if (!pointer || notif.date > pointer.date) notif.new = true
    else delete notif.new
  })

  const response: any = { results, countNew }

  if (req.query.count !== 'false') response.count = await mongo.notifications.countDocuments(query)

  res.json(response)
})

// push a notification directly to users, not through the events/subscriptions system
router.post('', async (req, res, next) => {
  assertReqInternal(req)
  if (!req.query.key || config.secretKeys.events !== req.query.key) throw httpError(401, 'Bad secret key')
  if (req.query.subscribedOnly) internalError('deprecated', '"subscribedOnly" parameter is depecrated when pushing a notification')

  if (!req.body.recipient) {
    if (req.query.subscribedOnly) internalError('deprecated', 'pushing an event through the POST notifications endpoint is deprecated')
    const { body } = eventsPostReq.returnValid(req, { name: 'req' })
    const event: Event = {
      ...body,
      _id: nanoid(),
      date: new Date().toISOString(),
      visibility: body.visibility ?? 'private'
    }
    await postEvent(event)
    res.status(201).json(event)
  } else {
    const notification: Notification = {
      ...body,
      _id: nanoid(),
      date: new Date().toISOString(),
      visibility: body.visibility ?? 'private'
    }
  }

  notification.visibility = notification.visibility ?? 'private'
  notification.date = new Date().toISOString()
  const valid = validate(notification)
  if (!valid) return res.status(400).send(validate.errors)

  // prepare the filter to find the topics matching this subscription
  const topicParts = notification.topic.key.split(':')
  const topicKeys = topicParts.map((part, i) => topicParts.slice(0, i + 1).join(':'))
  const subscriptionsFilter = { 'topic.key': { $in: topicKeys } }
  if (notification.visibility === 'private') subscriptionsFilter.visibility = 'private'
  if (notification.sender) {
    subscriptionsFilter['sender.type'] = notification.sender.type
    subscriptionsFilter['sender.id'] = notification.sender.id
    if (notification.sender.role) subscriptionsFilter['sender.role'] = notification.sender.role
    if (notification.sender.department) {
      if (notification.sender.department !== '*') {
        subscriptionsFilter['sender.department'] = notification.sender.department
      }
    } else {
      subscriptionsFilter['sender.department'] = { $exists: false }
    }
  } else {
    subscriptionsFilter.sender = { $exists: false }
  }
  if (notification.recipient) {
    subscriptionsFilter['recipient.id'] = notification.recipient.id
  }
  let nbSent = 0
  for await (const subscription of db.collection('subscriptions').find(subscriptionsFilter)) {
    await sendNotification(req, prepareSubscriptionNotification(notification, subscription))
    nbSent += 1
  }

  // if the notification was directly targetted to the user, no need for a subscription
  // the subscription might still have been used to customize locale, outputs, etc.. but it is not required
  if (notification.recipient && !nbSent && req.query.subscribedOnly !== 'true') {
    await sendNotification(req, notification)
  }

  const webhookSubscriptionssFilter = { ...subscriptionsFilter }
  delete webhookSubscriptionssFilter['recipient.id']
  for await (const webhookSubscription of db.collection('webhook-subscriptions').find(webhookSubscriptionssFilter)) {
    await createWebhook(req, notification, webhookSubscription)
  }

  res.status(200).json(notification)
})

export default router
