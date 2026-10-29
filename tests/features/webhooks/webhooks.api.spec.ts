import { test, expect } from '@playwright/test'
import WebSocket from 'ws'
import { axios, axiosAuth, clean, devBaseURL } from '../../support/axios.ts'
import { startHookServer, closedPortUrl } from '../../support/hook-server.ts'

const axPush = axios({ headers: { 'x-secret-key': 'secret-events' }, baseURL: devBaseURL })
const axDev = axios({ baseURL: devBaseURL })
const admin1 = await axiosAuth('test1-admin1')
const user1 = await axiosAuth('test-user1')

// open a WS as this user and subscribe to a channel, resolves with the subscription outcome
const wsSubscribe = async (ax: typeof admin1, channel: string) => {
  const cookies = ax.cookieJar.getCookiesSync(`http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`)
  const ws = new WebSocket(`ws://localhost:${process.env.DEV_API_PORT}`, { headers: { Cookie: cookies.map(String).join('; ') } })
  const messages: any[] = []
  const outcome = await new Promise<string>((resolve, reject) => {
    ws.on('message', (raw: Buffer) => {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'subscribe-confirm' || msg.type === 'error') resolve(msg.type)
      if (msg.type === 'message') messages.push(msg.data)
    })
    ws.on('open', () => ws.send(JSON.stringify({ type: 'subscribe', channel })))
    ws.on('error', reject)
  })
  return { ws, messages, outcome }
}

// helper to post event matching a webhook subscription owned by test1-admin1/test1
const postMatchingEvent = (title: string) => axPush.post('/api/events', [{
  date: new Date().toISOString(),
  topic: { key: 'topic1' },
  title,
  sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
  visibility: 'public'
}])

test.describe('webhooks', () => {
  test.beforeEach(clean)

  test('should create a webhook when event matches a webhook subscription', { tag: '@smoke' }, async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Test webhook sub',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1' },
      url: `${closedPortUrl}/hook`
    })

    await postMatchingEvent('a notification')

    const res = await admin1.get('/api/webhooks')
    expect(res.data.count).toBe(1)
    expect(res.data.results[0].status).toBe('waiting')
    expect(res.data.results[0].notification.title).toBe('a notification')
    expect(res.data.results[0].nbAttempts).toBe(0)
  })

  test('should not update the webhook subscription of another account', async () => {
    const { data: subscription } = await admin1.post('/api/webhook-subscriptions', {
      title: 'Test webhook sub',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1' },
      url: `${closedPortUrl}/hook`
    })
    await expect(user1.post('/api/webhook-subscriptions', {
      _id: subscription._id,
      title: 'Hijacked',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1' },
      url: `${closedPortUrl}/other`
    })).rejects.toMatchObject({ status: 404 })
    const { data } = await admin1.get('/api/webhook-subscriptions')
    expect(data.count).toBe(1)
    expect(data.results[0].url).toBe(`${closedPortUrl}/hook`)
  })

  test('should deliver a webhook to a target URL', async () => {
    const received: any[] = []
    const hookServer = await startHookServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk) => { chunks.push(chunk) })
      req.on('end', () => {
        received.push({ headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString()) })
        res.writeHead(200)
        res.end()
      })
    })

    try {
      await admin1.post('/api/webhook-subscriptions', {
        title: 'Test delivery',
        topic: { key: 'topic1' },
        sender: { type: 'organization', id: 'test1' },
        url: hookServer.url,
        header: { key: 'X-Secret', value: 'mysecret' }
      })

      await postMatchingEvent('webhook delivery test')

      // the webhook worker polls every 4s
      await expect.poll(async () => (await admin1.get('/api/webhooks')).data.results[0]?.status, { timeout: 12000 }).toBe('ok')

      expect(received.length).toBe(1)
      expect(received[0].body.title).toBe('webhook delivery test')
      expect(received[0].headers['x-secret']).toBe('mysecret')

      const res = await admin1.get('/api/webhooks')
      expect(res.data.results[0].status).toBe('ok')
      expect(res.data.results[0].nbAttempts).toBe(1)
    } finally {
      hookServer.close()
    }
  })

  test('should retry failed webhooks with backoff', async () => {
    let callCount = 0
    const hookServer = await startHookServer((req, res) => {
      callCount++
      req.on('data', () => {})
      req.on('end', () => {
        res.writeHead(500)
        res.end('Internal Server Error')
      })
    })

    try {
      await admin1.post('/api/webhook-subscriptions', {
        title: 'Retry test',
        topic: { key: 'topic1' },
        sender: { type: 'organization', id: 'test1' },
        url: hookServer.url
      })

      await postMatchingEvent('retry test')

      // the first attempt
      await expect.poll(async () => (await admin1.get('/api/webhooks')).data.results[0]?.status, { timeout: 12000 }).toBe('error')

      expect(callCount).toBe(1)

      const res = await admin1.get('/api/webhooks')
      expect(res.data.results[0].status).toBe('error')
      expect(res.data.results[0].nbAttempts).toBe(1)
      expect(res.data.results[0].lastAttempt).toBeTruthy()
      expect(res.data.results[0].nextAttempt).toBeTruthy()
    } finally {
      hookServer.close()
    }
  })

  test('should list webhook subscriptions of several topics', async () => {
    for (const key of ['topic1', 'topic2', 'topic3']) {
      await admin1.post('/api/webhook-subscriptions', {
        title: 'Sub ' + key,
        topic: { key },
        sender: { type: 'organization', id: 'test1' },
        url: `${closedPortUrl}/hook`
      })
    }
    const one = await admin1.get('/api/webhook-subscriptions', { params: { topic: 'topic1' } })
    expect(one.data.results.map((s: any) => s.topic.key)).toEqual(['topic1'])
    const two = await admin1.get('/api/webhook-subscriptions', { params: { topic: 'topic1,topic3', sort: 'title:1' } })
    expect(two.data.results.map((s: any) => s.topic.key)).toEqual(['topic1', 'topic3'])
  })

  test('should stream the delivery progress of a webhook subscription over WS', async () => {
    const hookServer = await startHookServer((req, res) => { req.resume(); req.on('end', () => { res.writeHead(200); res.end() }) })
    try {
      const sub = (await admin1.post('/api/webhook-subscriptions', {
        title: 'WS progress',
        topic: { key: 'topic1' },
        sender: { type: 'organization', id: 'test1' },
        url: hookServer.url
      })).data
      const channel = `${sub.owner.type}:${sub.owner.id}:webhook-subscriptions/${sub._id}/webhooks`

      // only an admin of the owning account can listen
      const other = await wsSubscribe(user1, channel)
      other.ws.close()
      expect(other.outcome).toBe('error')

      const { ws, messages, outcome } = await wsSubscribe(admin1, channel)
      try {
        expect(outcome).toBe('subscribe-confirm')
        await postMatchingEvent('ws progress')
        // the worker polls every 4s
        await expect.poll(() => messages.map(m => m.status), { timeout: 12000 }).toEqual(['waiting', 'working', 'ok'])
        expect(new Set(messages.map(m => m._id)).size).toBe(1)
        expect(messages[2].notification.title).toBe('ws progress')
      } finally {
        ws.close()
      }
    } finally {
      hookServer.close()
    }
  })

  test('should cancel a webhook', async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Cancel test',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1' },
      url: `${closedPortUrl}/hook`
    })

    await postMatchingEvent('cancel test')

    const list = await admin1.get('/api/webhooks')
    expect(list.data.count).toBe(1)
    const webhookId = list.data.results[0]._id

    const res = await admin1.post(`/api/webhooks/${webhookId}/_cancel`)
    expect(res.data.status).toBe('cancelled')
  })

  test('should retry a webhook on demand', async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Manual retry test',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1' },
      url: `${closedPortUrl}/hook`
    })

    await postMatchingEvent('manual retry')

    // the worker tries and fails: nothing listens there
    await expect.poll(async () => (await admin1.get('/api/webhooks')).data.results[0]?.status, { timeout: 12000 }).toBe('error')

    const list = await admin1.get('/api/webhooks')
    expect(list.data.results[0].status).toBe('error')

    const res = await admin1.post(`/api/webhooks/${list.data.results[0]._id}/_retry`)
    expect(res.data.status).toBe('waiting')
    expect(res.data.nbAttempts).toBe(0)
  })

  const postCoalesced = (title: string, topicKey = 'topic1') => axPush.post('/api/events', [{
    date: new Date().toISOString(),
    topic: { key: topicKey },
    title,
    sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
    // public like postMatchingEvent: admin1's subscriptions to test1 are forced to public visibility
    visibility: 'public',
    channels: ['webhooks'],
    coalesce: true
  }])

  const seedWebhook = (sub: any, _id: string, fields: Record<string, any>) => axDev.post('/api/test-env/webhooks', {
    _id,
    sender: { type: 'organization', id: 'test1' },
    owner: sub.owner,
    subscription: { _id: sub._id, title: sub.title },
    notification: { title: 'old', topic: { key: 'topic1' }, date: new Date().toISOString() },
    nbAttempts: 0,
    ...fields
  })

  const createSub = async (topicKey = 'topic1') => (await admin1.post('/api/webhook-subscriptions', {
    title: 'coalesce test', topic: { key: topicKey }, sender: { type: 'organization', id: 'test1' }, url: `${closedPortUrl}/hook`
  })).data

  test('coalesce resets a delivered webhook instead of queuing another', async () => {
    const sub = await createSub()
    await seedWebhook(sub, 'delivered', { status: 'ok', nbAttempts: 1, lastAttempt: { date: new Date().toISOString(), status: 200 } })
    await postCoalesced('new signal')
    const res = await admin1.get('/api/webhooks', { params: { subscription: sub._id } })
    expect(res.data.count).toBe(1)
    const webhook = (await axDev.get('/api/test-env/webhooks/delivered')).data
    expect(webhook.notification.title).toBe('new signal')
    expect(['waiting', 'working', 'ok', 'error']).toContain(webhook.status) // the worker may already have picked it
    expect(webhook.lastAttempt?.status).not.toBe(200)
  })

  test('coalesce keeps the backoff of a retrying webhook', async () => {
    const sub = await createSub()
    const nextAttempt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await seedWebhook(sub, 'retrying', { status: 'error', nbAttempts: 3, nextAttempt })
    await postCoalesced('new signal')
    const webhook = (await axDev.get('/api/test-env/webhooks/retrying')).data
    expect(webhook.notification.title).toBe('new signal')
    expect(webhook.status).toBe('error')
    expect(webhook.nbAttempts).toBe(3)
    expect(webhook.nextAttempt).toBe(nextAttempt)
  })

  test('coalesce leaves an in-flight webhook alone', async () => {
    const sub = await createSub()
    await seedWebhook(sub, 'in-flight', { status: 'working' })
    await postCoalesced('new signal')
    expect((await axDev.get('/api/test-env/webhooks/in-flight')).data.notification.title).toBe('old')
    expect((await admin1.get('/api/webhooks', { params: { subscription: sub._id } })).data.count).toBe(2)
  })

  test('coalesces per event topic key', async () => {
    const sub = await createSub('topic1') // matches topic1:a and topic1:b through prefix matching
    await postCoalesced('a1', 'topic1:a')
    await postCoalesced('b1', 'topic1:b')
    await postCoalesced('a2', 'topic1:a')
    const res = await admin1.get('/api/webhooks', { params: { subscription: sub._id } })
    expect(res.data.count).toBe(2)
    expect(res.data.results.map((w: any) => w.notification.title).sort()).toEqual(['a2', 'b1'])
  })
})
