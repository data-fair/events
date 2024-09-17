import type { SortDirection } from 'mongodb'
import type { Pointer } from '../types.ts'
import type { Notification } from '#types'

import { Router } from 'express'
import mongo from '#mongo'
import { session, mongoPagination } from '@data-fair/lib/express/index.js'

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

// push a notification
// TODO: do we still support posting a notification to send directly to a user without going through an event ?
/*
router.post('', async (req, res, next) => {
  const db = req.app.get('db')
  const notification = req.body

  if (req.query.key) {
    if (req.query.key !== config.secretKeys.notifications) return res.status(401).send()
  } else {
    await auth(false)(req, res, () => {})
    if (!req.user) return res.status(401).send()
    notification.sender = req.user.accountOwner
    notification.recipient = notification.recipient || { id: req.user.id, name: req.user.name }
    if (!req.user.adminMode && (!notification.recipient || notification.recipient.id !== req.user.id)) {
      return res.status(403).send()
    }
  }
  prometheus.receivedNotifications.inc()

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
  */

export default router
