import type { Filter, Sort } from 'mongodb'
import type { FullEvent } from '#types'

import { Router } from 'express'
import mongo from '#mongo'
import config from '#config'
import * as postReq from '#doc/events/post-req/index.ts'
import { session, mongoPagination, mongoProjection, httpError, assertReqInternalSecret, reqOrigin } from '@data-fair/lib-express/index.js'
import { postEvents, localizeEvent, cleanEvent } from './service.ts'

const router = Router()
export default router

router.get('', async (req, res, next) => {
  const sessionState = await session.reqAuthenticated(req)
  const { account, lang } = sessionState

  const query: Filter<FullEvent> = { 'sender.type': account.type, 'sender.id': account.id }
  if (req.query.q && typeof req.query.q === 'string') query.$text = { $search: req.query.q, $language: lang || config.i18n.defaultLocale }
  if (typeof req.query.resource === 'string') query['resource.id'] = req.query.resource

  const project = mongoProjection(req.query.select, ['_search', 'htmlBody'])

  // implement a special pagination based on the fact that we always sort by date
  const sort: Sort = { date: -1, _id: -1 }
  const { skip, size } = mongoPagination(req.query, 20)
  if (skip) throw httpError(400, 'skip is not supported, use "before" parameter with the date of the last event of the previous page')
  if (req.query.before && typeof req.query.before === 'string') {
    const [beforeDate, beforeId] = req.query.before.split('/')
    query.date = { $lte: beforeDate }
    // optional beforeId as a tie-breaker
    if (beforeId) query._id = { $lt: beforeId }
  }

  const events = (await mongo.events.find(query).project(project).limit(size).sort(sort).toArray()) as FullEvent[]

  const results = events.map(event => cleanEvent(localizeEvent(event, lang), sessionState))

  const response: any = { results }

  if (results.length === size) {
    const next = new URL(req.originalUrl, reqOrigin(req))
    next.searchParams.set('before', results[results.length - 1].date + '/' + results[results.length - 1]._id)
    response.next = next.href
  }

  res.json(response)
})

router.post('', async (req, res, next) => {
  assertReqInternalSecret(req, config.secretKeys.events)
  const { body } = postReq.returnValid(req, { name: 'req' })

  await postEvents(body)

  res.status(201).json(body)
})
