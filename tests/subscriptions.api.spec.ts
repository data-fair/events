import { test, expect } from '@playwright/test'
import WebSocket from 'ws'
import { axios, axiosAuth, clean } from './support/axios.ts'

const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: 'http://localhost:8082/events' })
const user1 = await axiosAuth('user1@test.com')
const user2 = await axiosAuth('user2@test.com')
const admin1 = await axiosAuth('admin1@test.com')

test.describe('subscriptions', () => {
  test.beforeEach(clean)

  test('should reject wrong recipient', async () => {
    await expect(user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      recipient: { id: 'anotheruser' },
      sender: { type: 'user', id: 'user1' }
    })).rejects.toMatchObject({ status: 403 })
  })

  test('should send a public notification to any subscribed user', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    }
    await admin1.post('/api/subscriptions', subscription)
    await expect(admin1.post('/api/subscriptions', subscription)).rejects.toMatchObject({ status: 409 })
    await user1.post('/api/subscriptions', subscription)
    await user2.post('/api/subscriptions', subscription)
    let res = await admin1.get('/api/subscriptions')
    expect(res.data.count).toBe(1)
    expect(res.data.results[0].origin).toBe('http://localhost:5600')

    res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      body: 'a notification from host {hostname}',
      sender: { type: 'user', id: 'user1', name: 'User 1' },
      visibility: 'public'
    }])
    res = await admin1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    expect(res.data.results[0].body).toBe('a notification from host localhost')
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    res = await user2.get('/api/notifications')
    expect(res.data.count).toBe(1)
  })

  test('should send a private notification only to member of sender organization', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1' }
    }
    let res = await admin1.post('/api/subscriptions', subscription)
    expect(res.data.visibility).toBe('private')
    res = await user1.post('/api/subscriptions', subscription)
    expect(res.data.visibility).toBe('private')
    res = await user2.post('/api/subscriptions', subscription)
    expect(res.data.visibility).toBe('public')

    res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' }
    }])
    res = await admin1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    res = await user2.get('/api/notifications')
    expect(res.data.count).toBe(0)
  })

  test('should send a private notification only to member of sender organization with certain role', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', role: 'admin' }
    }
    let res = await admin1.post('/api/subscriptions', subscription)
    expect(res.data.visibility).toBe('private')
    res = await user1.post('/api/subscriptions', subscription)
    expect(res.data.visibility).toBe('public')

    res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga1', role: 'admin', name: 'Orga 1' }
    }])
    res = await admin1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(0)
  })

  test('should not send a global private notification to member of a department in sender organization', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2' }
    }
    let res = await user2.post('/api/subscriptions', subscription)
    expect(res.data.visibility).toBe('public')

    res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2', name: 'Orga 2' }
    }])
    res = await user2.get('/api/notifications')
    expect(res.data.count).toBe(0)
  })

  test('should send a notification to any department', async () => {
    let res = await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep1', name: 'Orga 2' }
    })
    expect(res.data.visibility).toBe('private')
    res = await user2.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2', name: 'Orga 2' }
    })
    expect(res.data.visibility).toBe('private')

    res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2', department: '*', name: 'Orga 2' }
    }])

    res = await user2.get('/api/notifications')
    expect(res.data.count).toBe(1)
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(1)
  })

  test('should send a private department notification to member of right department in sender organization', async () => {
    let res = await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    expect(res.data.visibility).toBe('public')
    res = await user2.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    expect(res.data.visibility).toBe('private')

    res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2', department: 'dep2', name: 'Orga 2' }
    }])
    res = await user2.get('/api/notifications')
    expect(res.data.count).toBe(1)
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(0)
  })

  test('should send a notification with subscribedOnly option', async () => {
    const notif = {
      topic: { key: 'topic1' },
      title: 'a notification',
      body: 'a notification from host {hostname}',
      sender: { type: 'user', id: 'user1', name: 'User 1' },
      visibility: 'public',
      recipient: { id: 'admin1' }
    }
    let res = await axPush.post('/api/notifications', notif, { params: { subscribedOnly: 'true' } })
    res = await admin1.get('/api/notifications')
    expect(res.data.count).toBe(0)

    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    }
    await admin1.post('/api/subscriptions', subscription)

    res = await axPush.post('/api/notifications', notif, { params: { subscribedOnly: 'true' } })
    res = await admin1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    expect(res.data.results[0].body).toBe('a notification from host localhost')
  })

  test('should send a global public notification to any subscribed user', async () => {
    const subscription = {
      topic: { key: 'global-topic1' },
      visibility: 'public'
    }
    await admin1.post('/api/subscriptions', subscription)
    await expect(admin1.post('/api/subscriptions', subscription)).rejects.toMatchObject({ status: 409 })
    await user1.post('/api/subscriptions', subscription)
    await user2.post('/api/subscriptions', subscription)
    let res = await admin1.get('/api/subscriptions')
    expect(res.data.count).toBe(1)
    expect(res.data.results[0].origin).toBe('http://localhost:5600')

    res = await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'global-topic1' },
      title: 'a notification',
      body: 'a global notification from host {hostname}',
      visibility: 'public'
    }])
    res = await admin1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    expect(res.data.results[0].body).toBe('a global notification from host localhost')
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    res = await user2.get('/api/notifications')
    expect(res.data.count).toBe(1)
  })

  test('should send notifications of de-duplicated events', async () => {
    // user1 is subscribed in 2 different manners
    let res = await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1' }
    })
    res = await user1.post('/api/subscriptions', {
      topic: { key: 'topic2' },
      sender: { type: 'organization', id: 'orga1' }
    })

    // admin is subscribed in the second manner only
    res = await admin1.post('/api/subscriptions', {
      topic: { key: 'topic2' },
      sender: { type: 'organization', id: 'orga1' }
    })

    res = await axPush.post('/api/events', [{
      _id: 'test',
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'notif 1',
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' }
    }])
    res = await axPush.post('/api/events', [{
      _id: 'test',
      date: new Date().toISOString(),
      topic: { key: 'topic2' },
      title: 'notif 2',
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' }
    }])
    res = await admin1.get('/api/notifications')
    expect(res.data.count).toBe(1)
    // no duplicate created
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(1)

    // another notification sent straight to the user
    res = await axPush.post('/api/notifications', {
      // eventId: 'test',
      date: new Date().toISOString(),
      topic: { key: 'topic2' },
      title: 'notif 2',
      recipient: { id: 'user1' }
    })
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(2)

    // a duplicate not saved
    res = await axPush.post('/api/notifications', {
      eventId: 'test',
      date: new Date().toISOString(),
      topic: { key: 'topic2' },
      title: 'notif 2',
      recipient: { id: 'user1' }
    })
    res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(2)
  })

  test('should deliver direct notifications via WS', async () => {
    const cookies = user1.cookieJar.getCookiesSync('http://localhost:5600')
    const ws = new WebSocket('ws://localhost:8082', { headers: { Cookie: cookies.map(String).join('; ') } })
    const messages: any[] = []

    await new Promise<void>((resolve, reject) => {
      ws.on('message', (raw: Buffer) => {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'subscribe-confirm') resolve()
        if (msg.type === 'message') messages.push(msg)
      })
      ws.on('open', () => ws.send(JSON.stringify({ type: 'subscribe', channel: 'user:user1:notifications' })))
      ws.on('error', reject)
    })

    await axPush.post('/api/notifications', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1', name: 'User 1' },
      title: 'notif direct 1',
      recipient: { id: 'user1' }
    })
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(messages.length).toBe(1)
    expect(messages[0].data.title).toBe('notif direct 1')

    await axPush.post('/api/notifications', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1', name: 'User 1' },
      title: 'notif direct 2',
      recipient: { id: 'user1' }
    })
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(messages.length).toBe(2)
    expect(messages[1].data.title).toBe('notif direct 2')

    // a duplicate should not produce a WS message
    await axPush.post('/api/notifications', {
      eventId: 'ws-dedup',
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1', name: 'User 1' },
      title: 'notif dedup',
      recipient: { id: 'user1' }
    })
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(messages.length).toBe(3)

    await axPush.post('/api/notifications', {
      eventId: 'ws-dedup',
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1', name: 'User 1' },
      title: 'notif dedup',
      recipient: { id: 'user1' }
    })
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(messages.length).toBe(3)

    const res = await user1.get('/api/notifications')
    expect(res.data.count).toBe(3)

    ws.close()
  })
})
