import { expect } from '@playwright/test'
import { test } from './fixtures/login.ts'
import { axiosAuth, clean } from './support/axios.ts'

test.describe('Subscriptions UI', () => {
  test.beforeEach(clean)

  test('shows empty state when no subscriptions', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/events/embed/subscriptions', 'user1')
    await expect(page.getByText('No subscription')).toBeVisible()
  })

  test('shows subscriptions after creating one via API', async ({ page, goToWithAuth }) => {
    const user1 = await axiosAuth('user1@test.com')
    await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      title: 'My test subscription',
      sender: { type: 'user', id: 'user1', name: 'User 1' },
      outputs: ['devices']
    })

    await goToWithAuth('/events/embed/subscriptions', 'user1')
    await expect(page.getByText('1 subscription')).toBeVisible()
    await expect(page.getByText('My test subscription')).toBeVisible()
  })
})
