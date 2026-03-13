import { strict as assert } from 'node:assert'
import { it, describe, before, beforeEach, after } from 'node:test'
import { createServer } from 'node:http'
import { axios, axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'
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

describe('webhooks', () => {
  before(startApiServer)
  beforeEach(clean)
  after(stopApiServer)

  it('should create a webhook when event matches a webhook subscription', async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Test webhook sub',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1' },
      url: 'http://localhost:19876/hook'
    })

    await postMatchingEvent('a notification')

    const res = await admin1.get('/api/webhooks')
    assert.equal(res.data.count, 1)
    assert.equal(res.data.results[0].status, 'waiting')
    assert.equal(res.data.results[0].notification.title, 'a notification')
    assert.equal(res.data.results[0].nbAttempts, 0)
  })

  it('should deliver a webhook to a target URL', async () => {
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

      assert.equal(received.length, 1)
      assert.equal(received[0].body.title, 'webhook delivery test')
      assert.equal(received[0].headers['x-secret'], 'mysecret')

      const res = await admin1.get('/api/webhooks')
      assert.equal(res.data.results[0].status, 'ok')
      assert.equal(res.data.results[0].nbAttempts, 1)
    } finally {
      hookServer.close()
    }
  })

  it('should retry failed webhooks with backoff', async () => {
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

      assert.equal(callCount, 1)

      const res = await admin1.get('/api/webhooks')
      assert.equal(res.data.results[0].status, 'error')
      assert.equal(res.data.results[0].nbAttempts, 1)
      assert.ok(res.data.results[0].lastAttempt)
      assert.ok(res.data.results[0].nextAttempt)
    } finally {
      hookServer.close()
    }
  })

  it('should stop retrying after 10 failed attempts', async () => {
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
      assert.equal(webhook?.status, 'error')
      assert.equal(webhook?.nbAttempts, 10)
      // no more retries scheduled
      assert.ok(!webhook?.nextAttempt)
    } finally {
      hookServer.close()
    }
  })

  it('should cancel a webhook', async () => {
    await admin1.post('/api/webhook-subscriptions', {
      title: 'Cancel test',
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1' },
      url: 'http://localhost:19879/hook'
    })

    await postMatchingEvent('cancel test')

    const list = await admin1.get('/api/webhooks')
    assert.equal(list.data.count, 1)
    const webhookId = list.data.results[0]._id

    const res = await admin1.post(`/api/webhooks/${webhookId}/_cancel`)
    assert.equal(res.data.status, 'cancelled')
  })

  it('should retry a webhook on demand', async () => {
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
    assert.equal(list.data.results[0].status, 'error')

    const res = await admin1.post(`/api/webhooks/${list.data.results[0]._id}/_retry`)
    assert.equal(res.data.status, 'waiting')
    assert.equal(res.data.nbAttempts, 0)
  })
})
