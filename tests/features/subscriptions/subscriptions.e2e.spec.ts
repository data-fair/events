import { expect } from '@playwright/test'
import { test } from '../../fixtures/login.ts'
import { axiosAuth, clean } from '../../support/axios.ts'

test.describe('Subscriptions UI', () => {
  test.beforeEach(clean)

  test('shows empty state when no subscriptions', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/events/embed/subscriptions', 'test-user1')
    await expect(page.getByText('You are not subscribed to any notification.')).toBeVisible()
  })

  test('shows subscriptions after creating one via API', { tag: '@smoke' }, async ({ page, goToWithAuth }) => {
    const user1 = await axiosAuth('test-user1')
    await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      title: 'My test subscription',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' },
      outputs: ['devices']
    })

    await goToWithAuth('/events/embed/subscriptions', 'test-user1')
    await expect(page.getByText('1 subscription')).toBeVisible()
    await expect(page.getByText('My test subscription')).toBeVisible()
  })

  test('a single sender applies to every topic of the subscribe page', async ({ page, goToWithAuth }) => {
    // the personal account is active: a topic left without the sender would fall back to user:test-user1
    await goToWithAuth('/events/embed/subscribe?key=topic1,topic2&title=Topic 1,Topic 2&sender=organization:test1', 'test-user1')
    await page.getByLabel('Topic 2').check()

    const user1 = await axiosAuth('test-user1')
    await expect.poll(async () => (await user1.get('/api/subscriptions', { params: { topic: 'topic2' } })).data.results.map((s: any) => `${s.sender?.type}:${s.sender?.id}`))
      .toEqual(['organization:test1'])
  })

  test('the recap edits the outputs and unsubscribes', async ({ page, goToWithAuth }) => {
    const user1 = await axiosAuth('test-user1')
    await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      title: 'My test subscription',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' },
      outputs: ['devices']
    })
    const outputs = async () => (await user1.get('/api/subscriptions')).data.results.map((s: any) => s.outputs.sort())

    await goToWithAuth('/events/subscriptions', 'test-user1')
    await page.getByText('By email', { exact: true }).click()
    await expect.poll(outputs).toEqual([['devices', 'email']])

    await page.getByRole('button', { name: 'Unsubscribe' }).click()
    await page.getByRole('button', { name: 'Unsubscribe' }).last().click()
    await expect(page.getByText('You are not subscribed to any notification.')).toBeVisible()
    await expect.poll(outputs).toEqual([])
  })
})
