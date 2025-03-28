import { strict as assert } from 'node:assert'
import { it, describe, before, beforeEach, after } from 'node:test'
import { axios, axiosAuth, clean, startApiServer, stopApiServer, baseURL } from './utils/index.ts'

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
    let res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'user', id: 'user1', name: 'User 1' }
    }, {
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'another notification',
      sender: { type: 'user', id: 'user1', name: 'User 1' }
    }, {
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'anotherone',
      sender: { type: 'user', id: 'user1', name: 'User 1' }
    }])
    res = await admin1.get('/api/events')
    assert.equal(res.data.results.length, 0)
    res = await user1.get('/api/events')
    assert.equal(res.data.results.length, 3)
    res = await user1.get('/api/events?q=notification')
    assert.equal(res.data.results.length, 2)
    res = await user1.get('/api/events?q=test')
    assert.equal(res.data.results.length, 0)
    res = await user1.get('/api/events', { params: { size: 2 } })
    assert.equal(res.data.results.length, 2)
    assert.ok(res.data.next)
    const id1 = res.data.results[0]._id
    res = await user1.get(res.data.next)
    assert.equal(res.data.results.length, 1)
    assert.notEqual(res.data.results[0]._id, id1)
    assert.ok(!res.data.next)
  })

  it('should send an internationalized event', async () => {
    let res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: { en: 'an english notification', fr: 'une notification française' },
      sender: { type: 'user', id: 'user1', name: 'User 1' }
    }])
    res = await admin1.get('/api/events')
    assert.equal(res.data.results.length, 0)
    res = await user1.get('/api/events')
    assert.equal(res.data.results.length, 1)
    assert.equal(res.data.results[0].title, 'une notification française')
    res = await user1.get('/api/events?q=française')
    assert.equal(res.data.results.length, 1)
    user1.cookieJar.setCookie('i18n_lang=en', baseURL)
    res = await user1.get('/api/events')
    assert.equal(res.data.results.length, 1)
    assert.equal(res.data.results[0].title, 'an english notification')
  })
})
