import type { SortDirection, Filter } from 'mongodb'
import type { Event, SearchableEvent } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import mongo from '#mongo'
import config from '#config'
import doc from '#doc'
import { session, mongoPagination, mongoProjection, httpError, assertReqInternal, reqOrigin } from '@data-fair/lib/express/index.js'
import { localizeEvent } from './service.ts'
import { receiveEvent } from '../notifications/service.ts'

const router = Router()
export default router

router.get('', async (req, res, next) => {
  const { account, lang } = await session.reqAuthenticated(req)

  const query: Filter<Event> = { 'sender.type': account.type, 'sender.id': account.id }
  if (req.query.q && typeof req.query.q === 'string') query.$text = { $search: req.query.q, $language: lang || config.i18n.defaultLocale }

  const project = mongoProjection(req.query.select, ['_search', 'htmlBody'])

  // implement a special pagination based on the fact that we always sort by date
  const sort = { date: -1 as SortDirection }
  const { skip, size } = mongoPagination(req.query)
  if (skip) throw httpError(400, 'skip is not supported, use "before" parameter with the date of the last event of the previous page')
  if (req.query.before && typeof req.query.before === 'string') {
    const [beforeId, beforeDate] = req.query.before.split(':')
    query.date = { $lte: beforeDate }
    query._id = { $ne: beforeId }
  }

  const events = (await mongo.events.find(query).project(project).limit(size).sort(sort).toArray()) as Event[]

  const results = events.map(event => localizeEvent(event, lang))

  const response: any = { results }

  if (results.length === size) {
    const next = new URL(req.originalUrl, reqOrigin(req))
    next.searchParams.set('before', results[results.length - 1]._id + ':' + results[results.length - 1].date)
    response.next = next.href
  }

  res.json(response)
})

router.post('', async (req, res, next) => {
  assertReqInternal(req)
  if (!req.query.key || config.secretKeys.events !== req.query.key) throw httpError(401, 'Bad secret key')

  const { body } = doc.events.postReq.returnValid(req, { name: 'req' })

  const event: SearchableEvent = {
    ...body,
    _id: nanoid(),
    date: new Date().toISOString(),
    visibility: body.visibility ?? 'private'
  }

  // this logic should work much better on a mongodb version that would support multi-language indexing
  // https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/specify-language-text-index/create-text-index-multiple-languages/
  event._search = []
  for (const locale of config.i18n.locales) {
    const localizedEvent = localizeEvent(event, locale)
    const searchParts: (string | undefined)[] = [...event.topic.key.split(':'), event.topic.title, localizedEvent.title, localizedEvent.body]
    event._search.push({ language: locale, text: searchParts.filter(Boolean).join(' ') })
  }

  await mongo.events.insertOne(event)
  delete event._search

  await receiveEvent(event)

  res.status(201).json(event)
})
