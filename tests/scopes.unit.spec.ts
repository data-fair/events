import { test, expect } from '@playwright/test'
import { hasScope } from '@data-fair/lib-common-types/session/index.js'
import { apiDocs } from '../api/contract/api-docs.ts'
import { acceptedScopes, scopedOperations, scopeDescriptions, channelScopes, requireOperationScope } from '../api/src/shared/scopes.ts'

const state = (scopes?: string[]) => ({ lang: 'fr', scopes }) as any

test.describe('scope vocabulary', () => {
  test('accepted scopes of each family tier', () => {
    expect(acceptedScopes('notifications', 'read')).toEqual(['notifications:read', 'notifications:write', 'notifications', 'all:read', 'all:write', 'all:admin'])
    expect(acceptedScopes('notifications', 'write')).toEqual(['notifications:write', 'notifications', 'all:write', 'all:admin'])
    expect(acceptedScopes('events', 'read')).toEqual(['events:read', 'events', 'all:read', 'all:write', 'all:admin'])
    expect(acceptedScopes('webhooks', 'read')).toEqual(['webhooks:read', 'webhooks:admin', 'webhooks', 'all:read', 'all:write', 'all:admin'])
    expect(acceptedScopes('webhooks', 'admin')).toEqual(['webhooks:admin', 'webhooks', 'all:admin'])
  })

  test('operation table', () => {
    expect(scopedOperations).toEqual({
      listNotifications: { method: 'get', path: '/notifications', family: 'notifications', tier: 'read' },
      listSubscriptions: { method: 'get', path: '/subscriptions', family: 'notifications', tier: 'read' },
      getSubscription: { method: 'get', path: '/subscriptions/{id}', family: 'notifications', tier: 'read' },
      postSubscription: { method: 'post', path: '/subscriptions', family: 'notifications', tier: 'write' },
      deleteSubscription: { method: 'delete', path: '/subscriptions/{id}', family: 'notifications', tier: 'write' },
      listEvents: { method: 'get', path: '/events', family: 'events', tier: 'read' },
      listWebhookSubscriptions: { method: 'get', path: '/webhook-subscriptions', family: 'webhooks', tier: 'read' },
      postWebhookSubscription: { method: 'post', path: '/webhook-subscriptions', family: 'webhooks', tier: 'admin' },
      deleteWebhookSubscription: { method: 'delete', path: '/webhook-subscriptions/{id}', family: 'webhooks', tier: 'admin' },
      testWebhookSubscription: { method: 'post', path: '/webhook-subscriptions/{id}/_test', family: 'webhooks', tier: 'admin' },
      listWebhooks: { method: 'get', path: '/webhooks', family: 'webhooks', tier: 'read' },
      retryWebhook: { method: 'post', path: '/webhooks/{id}/_retry', family: 'webhooks', tier: 'admin' },
      cancelWebhook: { method: 'post', path: '/webhooks/{id}/_cancel', family: 'webhooks', tier: 'admin' }
    })
  })

  test('every accepted scope is described, in both locales', () => {
    const fr = scopeDescriptions('fr')
    for (const op of Object.values(scopedOperations)) {
      for (const scope of acceptedScopes(op.family, op.tier)) expect(Object.keys(fr)).toContain(scope)
    }
    expect(Object.keys(scopeDescriptions('en')).sort()).toEqual(Object.keys(fr).sort())
    expect(Object.keys(fr)).toHaveLength(11)
  })

  test('websocket channels', () => {
    expect(channelScopes('user:u1:notifications')).toEqual(acceptedScopes('notifications', 'read'))
    expect(channelScopes('organization:o1:webhook-subscriptions/abc')).toEqual(acceptedScopes('webhooks', 'read'))
    expect(channelScopes('user:u1:other')).toBeUndefined()
    expect(channelScopes('garbage')).toBeUndefined()
  })

  test('matching through the lib', () => {
    expect(hasScope(state(['all:write']), acceptedScopes('notifications', 'write'))).toBe(true)
    expect(hasScope(state(['all:write']), acceptedScopes('webhooks', 'admin'))).toBe(false)
    expect(hasScope(state(['webhooks']), acceptedScopes('webhooks', 'admin'))).toBe(true)
    for (const op of Object.values(scopedOperations)) {
      expect(hasScope(state(['notifications:readAdvanced']), acceptedScopes(op.family, op.tier))).toBe(false)
      expect(hasScope(state(), acceptedScopes(op.family, op.tier))).toBe(true)
    }
  })

  test('an unknown operation fails at declaration', () => {
    expect(() => requireOperationScope('nope' as any)).toThrow()
  })
})

test.describe('OpenAPI document', () => {
  const doc = apiDocs('fr')
  const oauth2Of = (op: any) => op.security.filter((s: any) => s.oauth2).map((s: any) => s.oauth2)
  const operations = Object.values(doc.paths).flatMap((methods: any) => Object.entries(methods).map(([method, op]: [string, any]) => ({ method, ...op })))

  test('every operation of the table is documented once, with its accepted scopes', () => {
    expect(operations.map(op => op.operationId).sort()).toEqual(Object.keys(scopedOperations).sort())
    for (const op of operations) {
      const row = scopedOperations[op.operationId as keyof typeof scopedOperations]
      expect(op.method, op.operationId).toBe(row.method)
      expect(doc.paths[row.path], op.operationId).toBeDefined()
      // standard OpenAPI: the scopes of one requirement are all needed, so each accepted scope is its own alternative
      expect(op.security, op.operationId).toEqual([{ sdCookie: [] }, ...acceptedScopes(row.family, row.tier).map(scope => ({ oauth2: [scope] }))])
    }
  })

  test('every scope used is declared in the oauth2 scheme', () => {
    const scheme = doc.components.securitySchemes.oauth2
    const declared = Object.keys(scheme.flows.clientCredentials.scopes)
    for (const op of operations) {
      for (const scope of oauth2Of(op).flat()) expect(declared).toContain(scope)
    }
    expect(scheme).not.toHaveProperty('x-scopeIncludes')
  })

  test('the document does not depend on the request origin', () => {
    // data-fair fetches it over the private url and sets the site origin itself
    expect(doc.servers).toEqual([{ url: '/events/api' }])
    expect(doc.components.securitySchemes.oauth2.flows.clientCredentials.tokenUrl).toBe('/simple-directory/api/auth/nhi-token')
  })

  test('webhook management is not granted by write tier scopes', () => {
    const post = doc.paths['/webhook-subscriptions'].post
    expect(oauth2Of(post).flat()).not.toContain('all:write')
    expect(oauth2Of(post).flat()).not.toContain('webhooks:read')
  })
})
