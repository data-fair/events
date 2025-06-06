import type { SortDirection } from 'mongodb'
import type { Pointer } from '../types.ts'
import type { Notification } from '#types'
import { nanoid } from 'nanoid'
import { Router } from 'express'
import debugModule from 'debug'
import mongo from '#mongo'
import config from '#config'
import { session, mongoPagination, assertReqInternalSecret } from '@data-fair/lib-express/index.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import * as eventsPostSingleReq from '#doc/events/post-single-req/index.ts'
import * as notificationsPostReq from '#doc/notifications/post-req/index.ts'
import { postEvents } from '../events/service.ts'
import { sendNotification } from './service.ts'

const debug = debugModule('events')

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
  assertReqInternalSecret(req, config.secretKeys.events)
  if (!req.body.recipient || req.query.subscribedOnly === 'true') {
    internalError('deprecated', 'pushing an event through the POST notifications endpoint is deprecated')
    debug('pushing an event through the POST notifications', req.body)
    req.body.date = req.body.date ?? new Date().toISOString()
    if (req.body.recipient && req.query.subscribedOnly === 'true') {
      req.body.subscribedRecipient = {
        id: req.body.recipient.id,
        name: req.body.recipient.name
      }
      delete req.body.recipient
    }
    const { body } = eventsPostSingleReq.returnValid(req, { name: 'req' })
    await postEvents([body])
    res.status(201).json(body)
  } else {
    debug('pushing a notification with a recipient', req.body)

    // small cleanup of deprecated stuff for retro-compatibility with notify
    // TODO should we manage more properly i18n of notification object ?
    // the problem is that locale is defined on a subscription and we don't have one here.. user level setting ?
    if (typeof req.body.title === 'object') req.body.title = req.body.title[config.i18n.defaultLocale]
    if (typeof req.body.body === 'object') req.body.body = req.body.body[config.i18n.defaultLocale]
    if (typeof req.body.htmlBody === 'object') req.body.htmlBody = req.body.htmlBody[config.i18n.defaultLocale]
    if (req.body.visibility) delete req.body.visibility

    const { body } = notificationsPostReq.returnValid(req, { name: 'req' })
    const notification: Notification = {
      ...body,
      _id: nanoid(),
      date: new Date().toISOString()
    }
    await sendNotification(notification)
    res.status(200).json(notification)
  }
})

export default router
