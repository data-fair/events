import type { SortDirection, Filter } from 'mongodb'
import type { Event, SearchableEvent } from '../../../shared/types/index.ts'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import mongo from '../mongo.ts'
import config from '../config.ts'
import * as postReq from './post-req/index.js'
import { session, asyncHandler, mongoPagination, mongoProjection, httpError } from '@data-fair/lib/express/index.js'
import { localizeEvent } from './service.ts'
import { receiveEvent } from '../notifications/service.ts'

const router = Router()
export default router

router.get('', asyncHandler(async (req, res, next) => {
  const { account, lang } = await session.reqAuthenticated(req)

  const query: Filter<Event> = { 'sender.type': account.type, 'sender.id': account.id }
  if (req.query.q && typeof req.query.q === 'string') query.$text = { $search: req.query.q }

  const project = mongoProjection(req.query.select, ['_search', 'htmlBody'])

  // implement a special pagination based on the fact that we always sort by date
  const sort = { date: -1 as SortDirection }
  const { skip, size } = mongoPagination(req.query)
  if (skip) throw httpError(400, 'skip is not supported, use "before" parameter with the date of the last event of the previous page')
  if (req.query.before && typeof req.query.before === 'string') {
    const [beforeId, beforeDate] = req.query.before.split(':')
    query.date = { $lte: beforeDate, _id: { $ne: beforeId } }
  }

  const events = (await mongo.events.find(query).project(project).limit(size).sort(sort).toArray()) as Event[]

  const results = events.map(event => localizeEvent(event, lang))

  const response: any = { results }

  if (results.length === size) {
    const next = new URL('/events' + req.originalUrl, req.headers.origin)
    next.searchParams.set('before', results[results.length - 1].date)
  }

  res.json(response)
}))

router.post('', asyncHandler(async (req, res, next) => {
  if (!req.query.key || req.query.key !== config.secretKeys.events) return res.status(401).send()

  const { body } = postReq.returnValid(req, { name: 'req' })

  const event: SearchableEvent = {
    ...body,
    _id: nanoid(),
    date: new Date().toISOString(),
    visibility: body.visibility ?? 'private'
  }

  // TODO: use multi-language indexing
  const localizedEvent = localizeEvent(event)
  const searchParts: (string | undefined)[] = [...event.topic.key.split(':'), event.topic.title, localizedEvent.title, localizedEvent.body]
  event._search = searchParts.filter(Boolean).join(' ')

  await mongo.events.insertOne(event)
  delete event._search

  await receiveEvent(event)

  res.status(201).json(event)
}))
