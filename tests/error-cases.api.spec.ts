import { test, expect } from '@playwright/test'
import { axios, axiosAuth, clean, devBaseURL } from './support/axios.ts'

const axAno = axios()
const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: devBaseURL })
const user1 = await axiosAuth('user1@test.com')
const admin1 = await axiosAuth('admin1@test.com')

test.describe('error cases', () => {
  test.beforeEach(clean)

  // --- Authentication errors ---

  test('should reject anonymous access to notifications', async () => {
    await expect(axAno.get('/api/notifications')).rejects.toMatchObject({ status: 401 })
  })

  test('should reject anonymous access to subscriptions', async () => {
    await expect(axAno.get('/api/subscriptions')).rejects.toMatchObject({ status: 401 })
  })

  test('should reject anonymous access to webhook-subscriptions', async () => {
    await expect(axAno.get('/api/webhook-subscriptions')).rejects.toMatchObject({ status: 401 })
  })

  test('should reject anonymous access to webhooks', async () => {
    await expect(axAno.get('/api/webhooks')).rejects.toMatchObject({ status: 401 })
  })

  test('should reject posting events without secret key', async () => {
    await expect(axAno.post('/api/events', [])).rejects.toMatchObject({ status: 421 })
  })

  test('should reject posting notifications without secret key', async () => {
    await expect(axAno.post('/api/notifications', {})).rejects.toMatchObject({ status: 421 })
  })

  // --- Validation errors ---

  test('should reject malformed events', async () => {
    // missing required fields
    try {
      await axPush.post('/api/events', [{ foo: 'bar' }])
      expect(true).toBe(false) // should not reach here
    } catch (err: any) {
      expect(err.status).toBeGreaterThanOrEqual(400)
      expect(err.status).toBeLessThan(500)
    }
  })

  test('should reject events that are not an array', async () => {
    try {
      await axPush.post('/api/events', { topic: { key: 'topic1' }, title: 'test' })
      expect(true).toBe(false) // should not reach here
    } catch (err: any) {
      expect(err.status).toBeGreaterThanOrEqual(400)
      expect(err.status).toBeLessThan(500)
    }
  })

  test('should reject subscription with wrong recipient', async () => {
    await expect(user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      recipient: { id: 'someone-else' },
      sender: { type: 'user', id: 'user1' }
    })).rejects.toMatchObject({ status: 403 })
  })

  // --- Event deduplication edge cases ---

  test('should handle rapid duplicate events gracefully', async () => {
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
    expect(res.data.results.length).toBe(1)
  })

  // --- Empty and boundary cases ---

  test('should handle empty events array', async () => {
    const res = await axPush.post('/api/events', [])
    expect(res.status).toBe(201)
  })

  test('should return empty results for user with no events', async () => {
    const res = await user1.get('/api/events')
    expect(res.data.results.length).toBe(0)
  })

  test('should return empty results for user with no notifications', async () => {
    const res = await user1.get('/api/notifications')
    expect(res.data.results.length).toBe(0)
    expect(res.data.count).toBe(0)
  })

  test('should return empty results for admin with no subscriptions', async () => {
    const res = await admin1.get('/api/subscriptions')
    expect(res.data.results.length).toBe(0)
    expect(res.data.count).toBe(0)
  })

  // --- Duplicate subscription ---

  test('should reject duplicate subscriptions', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    }
    await user1.post('/api/subscriptions', subscription)
    await expect(user1.post('/api/subscriptions', subscription)).rejects.toMatchObject({ status: 409 })
  })

  // --- Notification deduplication ---

  test('should deduplicate notifications with same eventId', async () => {
    const notif = {
      eventId: 'notif-dedup',
      topic: { key: 'topic1' },
      title: 'dedup notification',
      recipient: { id: 'user1' }
    }
    await axPush.post('/api/notifications', notif)
    await axPush.post('/api/notifications', notif)

    const res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(1)
  })
})
