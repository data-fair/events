import { test, expect } from '@playwright/test'
import { axios, axiosAuth, clean, baseURL, devBaseURL } from './support/axios.ts'

const axAno = axios()
const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: devBaseURL })
const axDev = axios({ baseURL: devBaseURL })
const user1 = await axiosAuth('test-user1')
const admin1 = await axiosAuth('test1-admin1')

test.describe('events', () => {
  test.beforeEach(clean)

  test('should reject posting from exterior', async () => {
    await expect(axAno.post('/api/events', {})).rejects.toMatchObject({ status: 421 })
  })

  test('should reject posting with bad secret key', async () => {
    await expect(axPush.post('/api/events', {}, { params: { key: 'badkey' } })).rejects.toMatchObject({ status: 401 })
  })

  test('should reject anonymous user', async () => {
    await expect(axAno.get('/api/events')).rejects.toMatchObject({ status: 401 })
  })

  test('should send an event', async () => {
    let res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }, {
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'another notification',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }, {
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'anotherone',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }])
    res = await admin1.get('/api/events')
    expect(res.data.results.length).toBe(0)
    res = await user1.get('/api/events')
    expect(res.data.results.length).toBe(3)
    res = await user1.get('/api/events?q=notification')
    expect(res.data.results.length).toBe(2)
    res = await user1.get('/api/events?q=nonexistent')
    expect(res.data.results.length).toBe(0)
    res = await user1.get('/api/events', { params: { size: 2 } })
    expect(res.data.results.length).toBe(2)
    expect(res.data.next).toBeTruthy()
    const id1 = res.data.results[0]._id
    res = await user1.get(res.data.next)
    expect(res.data.results.length).toBe(1)
    expect(res.data.results[0]._id).not.toBe(id1)
    expect(res.data.next).toBeFalsy()
  })

  test('should send an internationalized event', async () => {
    let res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: { en: 'an english notification', fr: 'une notification française' },
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }])
    res = await admin1.get('/api/events')
    expect(res.data.results.length).toBe(0)
    res = await user1.get('/api/events')
    expect(res.data.results.length).toBe(1)
    expect(res.data.results[0].title).toBe('une notification française')
    res = await user1.get('/api/events?q=française')
    expect(res.data.results.length).toBe(1)
    user1.cookieJar.setCookie('i18n_lang=en', baseURL)
    res = await user1.get('/api/events')
    expect(res.data.results.length).toBe(1)
    expect(res.data.results[0].title).toBe('an english notification')
  })

  test('should send an event with same id twice', async () => {
    let res = await axPush.post('/api/events', [{
      _id: 'test',
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'notif 1',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }])
    res = await axPush.post('/api/events', [{
      _id: 'test',
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'notif 2',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }])
    res = await user1.get('/api/events')
    expect(res.data.results.length).toBe(1)
    expect(res.data.results[0].title).toBe('notif 1')
  })

  test('does not store nor notify an event restricted to webhooks', async () => {
    // user1 is admin of its own account: its subscriptions stay private and it reads its own events
    const sender = { type: 'user', id: 'test-user1', name: 'User 1' }
    await user1.post('/api/subscriptions', { topic: { key: 'topic1' }, sender })
    await user1.post('/api/webhook-subscriptions', {
      title: 'channels test', topic: { key: 'topic1' }, sender, url: 'http://localhost:19890/hook'
    })
    await axPush.post('/api/events', [{ date: new Date().toISOString(), topic: { key: 'topic1' }, title: 'webhooks only', sender, channels: ['webhooks'] }])
    expect((await user1.get('/api/events')).data.results.length).toBe(0)
    expect((await user1.get('/api/notifications')).data.count).toBe(0)
    expect((await user1.get('/api/webhooks')).data.count).toBe(1)

    // same event on every channel: proves the three assertions above can see what they check
    await axPush.post('/api/events', [{ date: new Date().toISOString(), topic: { key: 'topic1' }, title: 'all channels', sender }])
    expect((await user1.get('/api/events')).data.results.length).toBe(1)
    expect((await user1.get('/api/notifications')).data.count).toBe(1)
    expect((await user1.get('/api/webhooks')).data.count).toBe(2)
  })

  test('does not persist delivery instructions', async () => {
    await axPush.post('/api/events', [{
      _id: 'channels-stored',
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'stored',
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
      channels: ['events', 'webhooks'],
      coalesce: true
    }])
    const stored = (await axDev.get('/api/test-env/events/channels-stored')).data
    expect(stored.title).toBe('stored')
    expect(stored.channels).toBeUndefined()
    expect(stored.coalesce).toBeUndefined()
  })
})
