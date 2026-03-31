import { expect } from '@playwright/test'
import { test } from './fixtures/login.ts'
import { axiosAuth, clean, devBaseURL, axios } from './support/axios.ts'

const axPush = axios({ headers: { 'x-secret-key': 'SECRET_EVENTS' }, baseURL: devBaseURL })

test.describe('DfNotificationQueue on dev page', () => {
  test.beforeEach(clean)

  test('bell button is visible on dev page', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/events/dev', 'test-user1')
    await expect(page.getByRole('button', { name: 'Open notification list' })).toBeVisible()
  })

  test('shows notification in dropdown after event is sent with subscription', async ({ page, goToWithAuth }) => {
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
      title: 'Dev page notification title',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }])

    // wait for notification processing
    await new Promise(resolve => setTimeout(resolve, 2000))

    await goToWithAuth('/events/dev', 'test-user1')
    await page.getByRole('button', { name: 'Open notification list' }).click()
    await expect(page.getByText('Dev page notification title')).toBeVisible()
  })
})
