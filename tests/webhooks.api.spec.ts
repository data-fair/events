import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { axios, axiosAuth, clean, devBaseURL } from './support/axios.ts'

const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: devBaseURL })
const axDev = axios({ baseURL: devBaseURL })
const admin1 = await axiosAuth('test1-admin1')

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

  test('should create a webhook when event matches a webhook subscription', async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Test webhook sub',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1' },
      url: 'http://localhost:19876/hook'
    })

    await postMatchingEvent('a notification')

    const res = await admin1.get('/api/webhooks')
    expect(res.data.count).toBe(1)
    expect(res.data.results[0].status).toBe('waiting')
    expect(res.data.results[0].notification.title).toBe('a notification')
    expect(res.data.results[0].nbAttempts).toBe(0)
  })

  test('should deliver a webhook to a target URL', async () => {
    const received: any[] = []
    const hookServer = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk) => { chunks.push(chunk) })
      req.on('end', () => {
        received.push({ headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString()) })
        res.writeHead(200)
        res.end()
      })
    })
    await new Promise<void>(resolve => hookServer.listen(19876, resolve))

    try {
      await admin1.post('/api/webhook-subscriptions', {
        title: 'Test delivery',
        topic: { key: 'topic1' },
        sender: { type: 'organization', id: 'test1' },
        url: 'http://localhost:19876/hook',
        header: { key: 'X-Secret', value: 'mysecret' }
      })

      await postMatchingEvent('webhook delivery test')

      // wait for the webhook worker to process (polls every 4s)
      await new Promise(resolve => setTimeout(resolve, 8000))

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
    const hookServer = createServer((req, res) => {
      callCount++
      req.on('data', () => {})
      req.on('end', () => {
        res.writeHead(500)
        res.end('Internal Server Error')
      })
    })
    await new Promise<void>(resolve => hookServer.listen(19877, resolve))

    try {
      await admin1.post('/api/webhook-subscriptions', {
        title: 'Retry test',
        topic: { key: 'topic1' },
        sender: { type: 'organization', id: 'test1' },
        url: 'http://localhost:19877/hook'
      })

      await postMatchingEvent('retry test')

      // wait for the first attempt
      await new Promise(resolve => setTimeout(resolve, 8000))

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

  test('should stop retrying after 10 failed attempts', async () => {
    // create a real webhook subscription and a failing server
    const hookServer = createServer((req, res) => {
      req.on('data', () => {})
      req.on('end', () => {
        res.writeHead(500)
        res.end('fail')
      })
    })
    await new Promise<void>(resolve => hookServer.listen(19878, resolve))

    try {
      const sub = (await admin1.post('/api/webhook-subscriptions', {
        title: 'Max retry test',
        topic: { key: 'topic1' },
        sender: { type: 'organization', id: 'test1' },
        url: 'http://localhost:19878/hook'
      })).data

      // insert a webhook with 9 previous attempts so the next failure is the 10th
      await axDev.post('/api/test-env/webhooks', {
        _id: 'test-max-retries',
        sender: { type: 'organization', id: 'test1' },
        owner: sub.owner,
        subscription: { _id: sub._id, title: sub.title },
        notification: {
          title: 'max retry test',
          topic: { key: 'topic1' },
          date: new Date().toISOString()
        },
        status: 'error',
        nbAttempts: 9,
        nextAttempt: new Date(Date.now() - 1000).toISOString()
      })

      await new Promise(resolve => setTimeout(resolve, 8000))

      const webhook = (await axDev.get('/api/test-env/webhooks/test-max-retries')).data
      expect(webhook?.status).toBe('error')
      expect(webhook?.nbAttempts).toBe(10)
      // no more retries scheduled
      expect(webhook?.nextAttempt).toBeFalsy()
    } finally {
      hookServer.close()
    }
  })

  test('should cancel a webhook', async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Cancel test',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1' },
      url: 'http://localhost:19879/hook'
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
      url: 'http://localhost:19880/hook'
    })

    await postMatchingEvent('manual retry')

    // wait for the worker to try (will fail because no server is listening)
    await new Promise(resolve => setTimeout(resolve, 8000))

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
    title: 'coalesce test', topic: { key: topicKey }, sender: { type: 'organization', id: 'test1' }, url: 'http://localhost:19891/hook'
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
