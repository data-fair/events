import type { AxiosInstance } from 'axios'
import { test, expect } from '@playwright/test'
import WebSocket from 'ws'
import { axios, clean, devBaseURL } from '../../support/axios.ts'
import { closedPortUrl } from '../../support/hook-server.ts'
import { nhiSession, scopeNhiId } from '../../support/nhi.ts'
import { scopedOperations, acceptedScopes } from '../../../api/src/shared/scopes.ts'

const axPush = axios({ headers: { 'x-secret-key': 'secret-events' }, baseURL: devBaseURL })

const subscription = { topic: { key: 'topic1' }, sender: { type: 'organization', id: 'test1' } }
const webhookSubscription = {
  title: 'Test webhook sub',
  topic: { key: 'topic1' },
  sender: { type: 'organization', id: 'test1' },
  url: `${closedPortUrl}/hook`
}

const scopeError = { status: 403, data: expect.stringMatching(/insufficient scope/) }

// the outcome of a call that must not be refused for its scopes (any other answer is fine)
const notScopeRefused = async (promise: Promise<any>) => {
  try {
    await promise
  } catch (err: any) {
    expect(String(err.data ?? err.message)).not.toMatch(/scope/)
  }
}

const call = (ax: AxiosInstance, operationId: keyof typeof scopedOperations) => {
  const op = scopedOperations[operationId]
  const url = '/api' + op.path.replace('{id}', 'none')
  return op.method === 'get' ? ax.get(url) : op.method === 'delete' ? ax.delete(url) : ax.post(url, {})
}

// open a WS with these cookies and subscribe to a channel, resolves with the subscription outcome
const wsSubscribe = async (cookie: string, channel: string) => {
  const ws = new WebSocket(`ws://localhost:${process.env.DEV_API_PORT}`, { headers: { Cookie: cookie } })
  const messages: any[] = []
  const outcome = await new Promise<{ type: string, data?: string }>((resolve, reject) => {
    ws.on('message', (raw: Buffer) => {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'subscribe-confirm' || msg.type === 'error') resolve(msg)
      if (msg.type === 'message') messages.push(msg.data)
    })
    ws.on('open', () => ws.send(JSON.stringify({ type: 'subscribe', channel })))
    ws.on('error', reject)
  })
  return { ws, messages, outcome }
}

test.describe('scope enforcement', () => {
  test.beforeEach(clean)

  test('each operation refuses scopes outside its family and accepts its own', async () => {
    const sessions: Record<string, AxiosInstance> = {}
    const session = async (scope: string) => (sessions[scope] ??= (await nhiSession(scope)).cookieAx)
    for (const operationId of Object.keys(scopedOperations) as (keyof typeof scopedOperations)[]) {
      const op = scopedOperations[operationId]
      const outOfFamily = op.family === 'events' ? 'notifications:read' : 'events:read'
      await expect(call(await session(outOfFamily), operationId), operationId).rejects.toMatchObject(scopeError)
      await notScopeRefused(call(await session(acceptedScopes(op.family, op.tier)[0]), operationId))
    }
  })

  test('the tier is enforced inside a family', async () => {
    const reader = (await nhiSession('notifications:read')).cookieAx
    expect((await reader.get('/api/subscriptions')).status).toBe(200)
    await expect(reader.post('/api/subscriptions', subscription)).rejects.toMatchObject(scopeError)

    const writer = (await nhiSession('notifications:write')).cookieAx
    const { data: created } = await writer.post('/api/subscriptions', subscription)
    expect((await writer.delete('/api/subscriptions/' + created._id)).status).toBe(204)
  })

  test('the notification bell works with notifications:read, cookie and bearer', async () => {
    await axPush.post('/api/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification for the NHI',
      recipient: { id: scopeNhiId }
    })
    const { cookieAx, bearerAx } = await nhiSession('notifications:read')
    expect((await cookieAx.get('/api/notifications', { params: { size: 0 } })).data.countNew).toBe(1)
    expect((await bearerAx.get('/api/notifications', { params: { size: 0 } })).data.countNew).toBe(1)
  })

  test('global tier scopes', async () => {
    const reader = (await nhiSession('all:read')).cookieAx
    for (const path of ['/api/notifications', '/api/events', '/api/webhook-subscriptions']) {
      expect((await reader.get(path)).status).toBe(200)
    }

    const writer = (await nhiSession('all:write')).cookieAx
    expect((await writer.post('/api/subscriptions', subscription)).status).toBe(200)
    await expect(writer.post('/api/webhook-subscriptions', webhookSubscription)).rejects.toMatchObject(scopeError)

    const admin = (await nhiSession('all:admin')).cookieAx
    expect((await admin.post('/api/webhook-subscriptions', webhookSubscription)).status).toBe(200)
  })

  test('routes outside the table stay refused', async () => {
    const admin = (await nhiSession('all:admin')).cookieAx
    for (const path of ['/api/push/registrations', '/api/admin/info']) {
      await expect(admin.get(path), path).rejects.toMatchObject({ status: 403, data: expect.stringMatching(/does not check scopes/) })
    }
  })

  test('routes that need no session work with a scoped session', { tag: '@smoke' }, async () => {
    const { cookieAx } = await nhiSession('notifications:read')
    expect((await cookieAx.get('/api/push/vapidkey')).status).toBe(200)
    const spa = await cookieAx.get('/embed/subscriptions')
    expect(spa.status).toBe(200)
    expect(spa.headers['content-type']).toMatch(/html/)
  })

  test('websocket channels', async () => {
    const reader = await nhiSession('notifications:read')

    const own = await wsSubscribe(reader.cookie, `user:${scopeNhiId}:notifications`)
    expect(own.outcome.type).toBe('subscribe-confirm')
    await axPush.post('/api/notifications', { topic: { key: 'topic1' }, title: 'live notification', recipient: { id: scopeNhiId } })
    await expect.poll(() => own.messages.length).toBe(1)
    expect(own.messages[0].title).toBe('live notification')
    own.ws.close()

    const other = await wsSubscribe(reader.cookie, 'user:test-user1:notifications')
    expect(other.outcome.type).toBe('error')
    expect(other.outcome.data).not.toMatch(/scope/)
    other.ws.close()

    const webhooksRefused = await wsSubscribe(reader.cookie, 'organization:test1:webhook-subscriptions/x')
    expect(webhooksRefused.outcome.type).toBe('error')
    expect(webhooksRefused.outcome.data).toMatch(/scope/)
    webhooksRefused.ws.close()

    const webhooksReader = await nhiSession('webhooks:read')
    const webhooks = await wsSubscribe(webhooksReader.cookie, 'organization:test1:webhook-subscriptions/x')
    expect(webhooks.outcome.type).toBe('subscribe-confirm')
    webhooks.ws.close()
  })

  test('the OpenAPI document declares the scopes, localized', async () => {
    const anonymous = axios()
    const fr = await anonymous.get('/api/api-docs.json')
    const scopes = fr.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes
    expect(Object.keys(scopes)).toHaveLength(11)
    expect(scopes['notifications:read']).toBe('Lire ses notifications et ses abonnements')
    expect(fr.headers.vary).toMatch(/Accept-Language/i)
    const en = await anonymous.get('/api/api-docs.json', { headers: { 'Accept-Language': 'en' } })
    expect(en.data.components.securitySchemes.oauth2.flows.clientCredentials.scopes['notifications:read']).toBe('Read own notifications and subscriptions')

    const { cookieAx } = await nhiSession('notifications:read')
    expect((await cookieAx.get('/api/api-docs.json')).status).toBe(200)

    // data-fair fetches it over the private url, without the reverse-proxy headers
    const direct = await axios({ baseURL: devBaseURL }).get('/api/api-docs.json')
    expect(direct.status).toBe(200)
    expect(direct.data.servers).toEqual([{ url: '/events/api' }])
  })

  test('routes that need no session ignore a broken credential', async () => {
    const brokenCookie = axios({ headers: { cookie: 'id_token=broken.token.value; id_token_sign=broken' } })
    expect((await brokenCookie.get('/api/push/vapidkey')).status).toBe(200)
    expect((await brokenCookie.get('/api/api-docs.json')).status).toBe(200)
    expect((await brokenCookie.post('/api/ui-logs', { message: 'scope test' })).status).toBe(200)
    // a guarded route still refuses it, through the error handler
    await expect(brokenCookie.get('/api/notifications', { timeout: 5000 })).rejects.toMatchObject({ status: 401 })

    // an internal secret push only depends on the secret, a stray bearer header is ignored
    const secretWithBearer = axios({ baseURL: devBaseURL, headers: { 'x-secret-key': 'secret-events', authorization: 'Bearer not-a-token' } })
    const res = await secretWithBearer.post('/api/events', [{ topic: { key: 'topic1' }, title: 'pushed with a stray bearer', sender: { type: 'user', id: 'test-user1', name: 'User 1' } }])
    expect(res.status).toBe(201)
  })
})
