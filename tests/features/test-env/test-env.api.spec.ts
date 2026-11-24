import { test, expect } from '@playwright/test'
import { axios, devBaseURL } from '../../support/axios.ts'

const axDev = axios({ baseURL: devBaseURL })

// two nested sub-spaces of this suite's own: the clean of one leaves the other alone
const a = 'test_events_cleana_'
const b = 'test_events_cleanb_'

const seed = async (p: string) => {
  await axDev.post('/api/test-env/notifications', { _id: `${p}notif`, recipient: { id: `${p}user` }, title: 'n' })
  await axDev.post('/api/test-env/subscriptions', { _id: `${p}sub`, recipient: { id: `${p}user` } })
  await axDev.post('/api/test-env/events', { _id: `${p}event`, sender: { type: 'user', id: `${p}user` } })
  for (const c of ['webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
    await axDev.post(`/api/test-env/${c}`, { _id: `${p}${c}`, owner: { type: 'user', id: `${p}user` } })
  }
}
const remaining = async (p: string) => {
  const ids = [`notifications/${p}notif`, `subscriptions/${p}sub`, `events/${p}event`, ...['webhooks', 'webhook-subscriptions', 'pushSubscriptions'].map(c => `${c}/${p}${c}`)]
  let n = 0
  for (const id of ids) if ((await axDev.get(`/api/test-env/${id}`)).data) n++
  return n
}

test.describe('test-env', () => {
  test('the clean needs a valid test prefix', async () => {
    for (const params of [{}, { prefix: '' }, { prefix: 'test' }, { prefix: 'test_' }, { prefix: 'test_events' }, { prefix: 'other_x_' }, { prefix: 'test_.*_' }]) {
      await expect(axDev.delete('/api/test-env', { params })).rejects.toMatchObject({ status: 400 })
    }
  })

  test('the clean of a prefix removes what its accounts own, and only that', async () => {
    await axDev.delete('/api/test-env', { params: { prefix: a } })
    await axDev.delete('/api/test-env', { params: { prefix: b } })
    await seed(a)
    await seed(b)
    const res = await axDev.delete('/api/test-env', { params: { prefix: a } })
    expect(res.status).toBe(204)
    expect(await remaining(a)).toBe(0)
    expect(await remaining(b)).toBe(6)
    await axDev.delete('/api/test-env', { params: { prefix: b } })
    expect(await remaining(b)).toBe(0)
  })
})
