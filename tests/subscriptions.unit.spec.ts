import { test, expect } from '@playwright/test'
import { canSubscribePrivate } from '../api/src/subscriptions/operations.ts'

const makeUser = (overrides: any = {}) => ({
  id: 'user1',
  email: 'user1@test.com',
  name: 'User 1',
  organizations: [],
  ...overrides
})

test.describe('canSubscribePrivate', () => {
  test('admin mode always returns true', () => {
    const user = makeUser({ adminMode: 1 })
    expect(canSubscribePrivate({ type: 'organization', id: 'any' }, user)).toBe(true)
  })

  test('returns false when no sender', () => {
    expect(canSubscribePrivate(undefined, makeUser())).toBe(false)
  })

  test('user sender matches own id', () => {
    expect(canSubscribePrivate({ type: 'user', id: 'user1' }, makeUser())).toBe(true)
  })

  test('user sender does not match other id', () => {
    expect(canSubscribePrivate({ type: 'user', id: 'other' }, makeUser())).toBe(false)
  })

  test('org sender when user is member', () => {
    const user = makeUser({
      organizations: [{ id: 'org1', name: 'Org', role: 'user' }]
    })
    expect(canSubscribePrivate({ type: 'organization', id: 'org1' }, user)).toBe(true)
  })

  test('org sender when user is not member', () => {
    const user = makeUser({ organizations: [] })
    expect(canSubscribePrivate({ type: 'organization', id: 'org1' }, user)).toBe(false)
  })

  test('org sender with department user belongs to', () => {
    const user = makeUser({
      organizations: [
        { id: 'org1', name: 'Org', role: 'user' },
        { id: 'org1', name: 'Org', role: 'user', department: 'dep1' }
      ]
    })
    expect(canSubscribePrivate({ type: 'organization', id: 'org1', department: 'dep1' }, user)).toBe(true)
  })

  test('org sender with department falls back to org membership', () => {
    const user = makeUser({
      organizations: [{ id: 'org1', name: 'Org', role: 'user' }]
    })
    expect(canSubscribePrivate({ type: 'organization', id: 'org1', department: 'dep1' }, user)).toBe(true)
  })

  test('org sender with role user does not have', () => {
    const user = makeUser({
      organizations: [{ id: 'org1', name: 'Org', role: 'user' }]
    })
    expect(canSubscribePrivate({ type: 'organization', id: 'org1', role: 'admin' }, user)).toBe(false)
  })

  test('org sender with role user has', () => {
    const user = makeUser({
      organizations: [{ id: 'org1', name: 'Org', role: 'admin' }]
    })
    expect(canSubscribePrivate({ type: 'organization', id: 'org1', role: 'admin' }, user)).toBe(true)
  })

  test('org admin can subscribe to any role', () => {
    const user = makeUser({
      organizations: [{ id: 'org1', name: 'Org', role: 'admin' }]
    })
    expect(canSubscribePrivate({ type: 'organization', id: 'org1', role: 'contrib' }, user)).toBe(true)
  })
})
