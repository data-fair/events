import { test, expect } from '@playwright/test'
import { decodeJwt, decodeProtectedHeader } from 'jose'
import { clean } from './support/axios.ts'
import { nhiSession } from './support/nhi.ts'

test.describe('test NHI sessions', () => {
  test.beforeEach(clean)

  test('the exchange returns a scoped access token', async () => {
    const { accessToken } = await nhiSession('notifications:read')
    expect(decodeJwt(accessToken).scope).toBe('notifications:read')
    expect(decodeProtectedHeader(accessToken).kid).toMatch(/^scoped-/)
  })

  test('a scoped session reads its notifications, events is scope-aware', async () => {
    const { cookieAx } = await nhiSession('notifications:read')
    const res = await cookieAx.get('/api/notifications')
    expect(res.status).toBe(200)
  })

  test('an unscoped session reads its notifications', async () => {
    const { cookieAx } = await nhiSession()
    const res = await cookieAx.get('/api/notifications')
    expect(res.status).toBe(200)
  })
})
