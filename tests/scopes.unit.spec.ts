import { test, expect } from '@playwright/test'
import { hasScope } from '@data-fair/lib-common-types/session/index.js'
import { apiDocs } from '../api/contract/api-docs.ts'
import { acceptedScopes, scopedOperations, scopeDescriptions, scopeIncludes, channelScopes, requireOperationScope } from '../api/src/shared/scopes.ts'

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

  test('global tier inclusions', () => {
    expect(scopeIncludes).toEqual({
      'all:read': ['notifications:read', 'events:read', 'webhooks:read'],
      'all:write': ['notifications:read', 'events:read', 'webhooks:read', 'notifications:write'],
      'all:admin': ['notifications:read', 'events:read', 'webhooks:read', 'notifications:write', 'webhooks:admin']
    })
    const declared = Object.keys(scopeDescriptions('fr'))
    for (const included of Object.values(scopeIncludes).flat()) expect(declared).toContain(included)
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
  const doc = apiDocs('http://x/events/api', 'http://x/simple-directory', 'fr')
  const operations = Object.values(doc.paths).flatMap((methods: any) => Object.entries(methods).map(([method, op]: [string, any]) => ({ method, ...op })))

  test('every operation of the table is documented once, with its accepted scopes', () => {
    expect(operations.map(op => op.operationId).sort()).toEqual(Object.keys(scopedOperations).sort())
    for (const op of operations) {
      const row = scopedOperations[op.operationId as keyof typeof scopedOperations]
      expect(op.method, op.operationId).toBe(row.method)
      expect(doc.paths[row.path], op.operationId).toBeDefined()
      expect(op.security, op.operationId).toEqual([{ sdCookie: [] }, { oauth2: acceptedScopes(row.family, row.tier) }])
    }
  })

  test('every scope used is declared in the oauth2 scheme', () => {
    const scheme = doc.components.securitySchemes.oauth2
    expect(scheme.flows.clientCredentials.tokenUrl).toBe('http://x/simple-directory/api/auth/nhi-token')
    const declared = Object.keys(scheme.flows.clientCredentials.scopes)
    for (const op of operations) {
      for (const scope of op.security[1].oauth2) expect(declared).toContain(scope)
    }
    expect(scheme['x-scopeIncludes']).toEqual(scopeIncludes)
    for (const included of Object.values(scheme['x-scopeIncludes'] as Record<string, string[]>).flat()) expect(declared).toContain(included)
  })

  test('webhook management is not granted by write tier scopes', () => {
    const post = doc.paths['/webhook-subscriptions'].post
    expect(post.security[1].oauth2).not.toContain('all:write')
    expect(post.security[1].oauth2).not.toContain('webhooks:read')
  })
})
