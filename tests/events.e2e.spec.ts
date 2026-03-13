import { expect } from '@playwright/test'
import { test } from './fixtures/login.ts'
import { axios, clean, devBaseURL } from './support/axios.ts'

const axPush = axios({ headers: { 'x-secret-key': 'SECRET_EVENTS' }, baseURL: devBaseURL })

test.describe('Events UI', () => {
  test.beforeEach(clean)

  test('shows empty state when no events', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/events/embed/events', 'user1')
    await expect(page.getByText('Aucun résultat')).toBeVisible()
  })

  test('shows events after they are posted', async ({ page, goToWithAuth }) => {
    await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'My test event',
      sender: { type: 'user', id: 'user1', name: 'User 1' }
    }])

    await goToWithAuth('/events/embed/events', 'user1')
    await expect(page.getByText('My test event')).toBeVisible()
  })
})
