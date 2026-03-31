import { expect } from '@playwright/test'
import { test } from './fixtures/login.ts'
import { axiosAuth, clean, devBaseURL, axios } from './support/axios.ts'

const axPush = axios({ headers: { 'x-secret-key': 'SECRET_EVENTS' }, baseURL: devBaseURL })

test.describe('Notifications UI', () => {
  test.beforeEach(clean)

  test('shows empty state when no notifications', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/events/embed/notifications', 'test-user1')
    await expect(page.getByText('No notification')).toBeVisible()
  })

  test('shows notifications after events are sent with subscription', async ({ page, goToWithAuth }) => {
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

    // wait a bit for notification processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    await goToWithAuth('/events/embed/notifications', 'test-user1')
    await expect(page.getByText('Test notification title')).toBeVisible()
    await expect(page.getByText('1 notification')).toBeVisible()
  })
})
