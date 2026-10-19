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

  test('a scoped session is refused while events is not scope-aware', async () => {
    const { cookieAx } = await nhiSession('notifications:read')
    await expect(cookieAx.get('/api/notifications')).rejects.toMatchObject({ status: 403, data: expect.stringMatching(/does not accept scope-restricted sessions/) })
  })

  test('an unscoped session reads its notifications', async () => {
    const { cookieAx } = await nhiSession()
    const res = await cookieAx.get('/api/notifications')
    expect(res.status).toBe(200)
  })
})
