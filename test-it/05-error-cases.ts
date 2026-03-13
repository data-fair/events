import { strict as assert } from 'node:assert'
import { it, describe, before, beforeEach, after } from 'node:test'
import { axios, axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'

const axAno = axios()
const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: 'http://localhost:8082/events' })
const user1 = await axiosAuth('user1@test.com')
const admin1 = await axiosAuth('admin1@test.com')

describe('error cases', () => {
  before(startApiServer)
  beforeEach(clean)
  after(stopApiServer)

  // --- Authentication errors ---

  it('should reject anonymous access to notifications', async () => {
    await assert.rejects(axAno.get('/api/notifications'), { status: 401 })
  })

  it('should reject anonymous access to subscriptions', async () => {
    await assert.rejects(axAno.get('/api/subscriptions'), { status: 401 })
  })

  it('should reject anonymous access to webhook-subscriptions', async () => {
    await assert.rejects(axAno.get('/api/webhook-subscriptions'), { status: 401 })
  })

  it('should reject anonymous access to webhooks', async () => {
    await assert.rejects(axAno.get('/api/webhooks'), { status: 401 })
  })

  it('should reject posting events without secret key', async () => {
    await assert.rejects(axAno.post('/api/events', []), { status: 421 })
  })

  it('should reject posting notifications without secret key', async () => {
    await assert.rejects(axAno.post('/api/notifications', {}), { status: 421 })
  })

  // --- Validation errors ---

  it('should reject malformed events', async () => {
    // missing required fields
    await assert.rejects(axPush.post('/api/events', [{ foo: 'bar' }]), (err: any) => {
      assert.ok(err.status >= 400 && err.status < 500)
      return true
    })
  })

  it('should reject events that are not an array', async () => {
    await assert.rejects(axPush.post('/api/events', { topic: { key: 'topic1' }, title: 'test' }), (err: any) => {
      assert.ok(err.status >= 400 && err.status < 500)
      return true
    })
  })

  it('should reject subscription with wrong recipient', async () => {
    await assert.rejects(user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      recipient: { id: 'someone-else' },
      sender: { type: 'user', id: 'user1' }
    }), { status: 403 })
  })

  // --- Event deduplication edge cases ---

  it('should handle rapid duplicate events gracefully', async () => {
    // send the same event ID multiple times concurrently
    const event = {
      _id: 'dedup-test',
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'dedup test',
      sender: { type: 'user', id: 'user1', name: 'User 1' }
    }
    await Promise.all([
      axPush.post('/api/events', [event]),
      axPush.post('/api/events', [event]),
      axPush.post('/api/events', [event])
    ])

    const res = await user1.get('/api/events')
    assert.equal(res.data.results.length, 1)
  })

  // --- Empty and boundary cases ---

  it('should handle empty events array', async () => {
    const res = await axPush.post('/api/events', [])
    assert.equal(res.status, 201)
  })

  it('should return empty results for user with no events', async () => {
    const res = await user1.get('/api/events')
    assert.equal(res.data.results.length, 0)
  })

  it('should return empty results for user with no notifications', async () => {
    const res = await user1.get('/api/notifications')
    assert.equal(res.data.results.length, 0)
    assert.equal(res.data.count, 0)
  })

  it('should return empty results for admin with no subscriptions', async () => {
    const res = await admin1.get('/api/subscriptions')
    assert.equal(res.data.results.length, 0)
    assert.equal(res.data.count, 0)
  })

  // --- Duplicate subscription ---

  it('should reject duplicate subscriptions', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    }
    await user1.post('/api/subscriptions', subscription)
    await assert.rejects(user1.post('/api/subscriptions', subscription), { status: 409 })
  })

  // --- Notification deduplication ---

  it('should deduplicate notifications with same eventId', async () => {
    const notif = {
      eventId: 'notif-dedup',
      topic: { key: 'topic1' },
      title: 'dedup notification',
      recipient: { id: 'user1' }
    }
    await axPush.post('/api/notifications', notif)
    await axPush.post('/api/notifications', notif)

    const res = await user1.get('/api/notifications')
    assert.equal(res.data.count, 1)
  })
})
