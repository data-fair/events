import { strict as assert } from 'node:assert'
import { it, describe, before, beforeEach, after } from 'node:test'
import { axios, axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'

const axAno = axios()
const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: 'http://localhost:8082/events' })
const user1 = await axiosAuth('user1@test.com')
const admin1 = await axiosAuth('admin1@test.com')

describe('events', () => {
  before(startApiServer)
  beforeEach(clean)
  after(stopApiServer)

  it('should reject posting from exterior', async () => {
    await assert.rejects(axAno.post('/api/events', {}), { status: 421 })
  })

  it('should reject posting with bad secret key', async () => {
    await assert.rejects(axPush.post('/api/events', {}, { params: { key: 'badkey' } }), { status: 401 })
  })

  it('should reject anonymous user', async () => {
    await assert.rejects(axAno.get('/api/events'), { status: 401 })
  })

  it('should send an event', async () => {
    let res = await axPush.post('/api/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'user', id: 'user1' }
    })
    assert.ok(res.data.date)
    res = await admin1.get('/api/events')
    assert.equal(res.data.results.length, 0)
    res = await user1.get('/api/events')
    assert.equal(res.data.results.length, 1)
    res = await user1.get('/api/events?q=notification')
    assert.equal(res.data.results.length, 1)
    res = await user1.get('/api/events?q=test')
    assert.equal(res.data.results.length, 0)
  })

  it('should send an internationalized event', async () => {
    let res = await axPush.post('/api/events', {
      topic: { key: 'topic1' },
      title: { en: 'an english notification', fr: 'une notification française' },
      sender: { type: 'user', id: 'user1' }
    })
    assert.ok(res.data.date)
    res = await admin1.get('/api/events')
    assert.equal(res.data.results.length, 0)
    res = await user1.get('/api/events')
    assert.equal(res.data.results.length, 1)
    assert.equal(res.data.results[0].title, 'une notification française')
    res = await user1.get('/api/events?q=française')
    assert.equal(res.data.results.length, 1)
    res = await user1.get('/api/events', { headers: { Cookie: `${user1.defaults.headers.common.Cookie};i18n_lang=en` } })
    assert.equal(res.data.results.length, 1)
    assert.equal(res.data.results[0].title, 'an english notification')
  })
})
