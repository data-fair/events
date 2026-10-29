import { expect } from '@playwright/test'
import { test } from '../../fixtures/login.ts'
import { axiosAuth, clean, devBaseURL, axios } from '../../support/axios.ts'

const axPush = axios({ headers: { 'x-secret-key': 'secret-events' }, baseURL: devBaseURL })

test.describe('Notifications UI', () => {
  test.beforeEach(clean)

  test('shows empty state when no notifications', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/events/embed/notifications', 'test-user1')
    await expect(page.getByText('You have not received any notifications yet.')).toBeVisible()
  })

  test('shows notifications after events are sent with subscription', { tag: '@smoke' }, async ({ page, goToWithAuth }) => {
    // create a subscription for test-user1
    const user1 = await axiosAuth('test-user1')
    await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'test-user1', name: 'User 1' },
      outputs: ['devices']
    })

    // send an event matching the subscription
    await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'Test notification title',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }])

    await goToWithAuth('/events/embed/notifications', 'test-user1')
    await expect(page.getByText('Test notification title')).toBeVisible()
    await expect(page.getByText('1 notification')).toBeVisible()
  })

  test('marks the unread notifications and loads the older ones', async ({ page, goToWithAuth }) => {
    const notify = (title: string) => axPush.post('/api/notifications', { topic: { key: 'topic1' }, title, recipient: { id: 'test-user1' } })
    for (let i = 0; i < 21; i++) await notify(`old notification ${i}`)
    // reading the list moves the pointer of the user
    await (await axiosAuth('test-user1')).get('/api/notifications', { params: { size: 1 } })
    await notify('fresh notification')

    await goToWithAuth('/events/notifications', 'test-user1')
    await expect(page.getByText('22 notifications · 1 new')).toBeVisible()
    await expect(page.locator('.v-list-item')).toHaveCount(20)
    await page.getByRole('button', { name: 'See more' }).click()
    await expect(page.locator('.v-list-item')).toHaveCount(22)
    // the second page moved the pointer again, only the first listing tells what is new
    await expect(page.locator('.v-list-item--active')).toHaveCount(1)
    await expect(page.locator('.v-list-item--active')).toContainText('fresh notification')
  })
})
