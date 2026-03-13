import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { axios, axiosAuth, clean } from './support/axios.ts'
import mongo from '@data-fair/lib-node/mongo.js'

const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: 'http://localhost:8082/events' })
const admin1 = await axiosAuth('admin1@test.com')

// helper to post event matching a webhook subscription owned by admin1/orga1
const postMatchingEvent = (title: string) => axPush.post('/api/events', [{
  date: new Date().toISOString(),
  topic: { key: 'topic1' },
  title,
  sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
  visibility: 'public'
}])

test.describe('webhooks', () => {
  test.beforeEach(clean)

  test('should create a webhook when event matches a webhook subscription', async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Test webhook sub',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1' },
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
        sender: { type: 'organization', id: 'orga1' },
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
        sender: { type: 'organization', id: 'orga1' },
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
        sender: { type: 'organization', id: 'orga1' },
        url: 'http://localhost:19878/hook'
      })).data

      // insert a webhook with 9 previous attempts so the next failure is the 10th
      await mongo.db.collection('webhooks').insertOne({
        _id: 'test-max-retries' as any,
        sender: { type: 'organization', id: 'orga1' },
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

      const webhook = await mongo.db.collection('webhooks').findOne({ _id: 'test-max-retries' as any })
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
      sender: { type: 'organization', id: 'orga1' },
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
      sender: { type: 'organization', id: 'orga1' },
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
})
