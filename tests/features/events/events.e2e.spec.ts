import { expect } from '@playwright/test'
import { test } from '../../fixtures/login.ts'
import { axios, clean, devBaseURL } from '../../support/axios.ts'

const axPush = axios({ headers: { 'x-secret-key': 'secret-events' }, baseURL: devBaseURL })

test.describe('Events UI', () => {
  test.beforeEach(clean)

  test('shows empty state when no events', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/events/embed/events', 'test-user1')
    await expect(page.getByText('No activity yet.')).toBeVisible()
  })

  test('shows events after they are posted', async ({ page, goToWithAuth }) => {
    await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'My test event',
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }])

    await goToWithAuth('/events/embed/events', 'test-user1')
    await expect(page.getByText('My test event')).toBeVisible()
  })

  test('the embed starts with 5 events, the full page with 20', async ({ page, goToWithAuth }) => {
    const now = Date.now()
    await axPush.post('/api/events', Array.from({ length: 30 }, (_, i) => ({
      date: new Date(now - i * 1000).toISOString(),
      topic: { key: 'topic1' },
      title: `event ${i}`,
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    })))
    const events = page.getByText(/^event \d+$/)

    // a tab of a resource page, the iframe grows with the list
    await goToWithAuth('/events/embed/events', 'test-user1')
    await expect(events).toHaveCount(5)
    await page.getByRole('button', { name: 'See more' }).click()
    await expect(events).toHaveCount(25)

    await goToWithAuth('/events/events', 'test-user1')
    await expect(events).toHaveCount(20)
  })

  test('the recent activity of the dashboard shows the 5 last events and their author', async ({ page, goToWithAuth }) => {
    const now = Date.now()
    const event = (i: number, originator: object) => ({
      date: new Date(now - i * 1000).toISOString(),
      topic: { key: 'topic1' },
      title: `activity ${i}`,
      sender: { type: 'user', id: 'test-user1', name: 'User 1' },
      originator
    })
    await axPush.post('/api/events', [
      event(0, { internalProcess: { id: 'worker', title: 'Worker' } }),
      event(1, { apiKey: { id: 'key1', title: 'Import key' } }),
      // the API hides the identity of a platform admin
      event(2, { user: { id: 'superadmin', name: 'Super Admin', admin: true } }),
      event(3, { user: { id: 'test-user1', name: 'User 1' } }),
      event(4, {}),
      event(5, {})
    ])

    // DfRecentActivity of @data-fair/lib-vuetify-events, first block of the integrations dev page
    await goToWithAuth('/events/dev/integrations', 'test-user1')
    const timeline = page.locator('.v-timeline')
    await expect(timeline.getByText(/^activity \d$/)).toHaveCount(5)
    await expect(timeline.getByText('activity 5')).toHaveCount(0)
    for (const author of ['Worker', 'Import key', 'Administrator', 'User 1']) {
      await expect(timeline.getByText(new RegExp(`^${author} ·`))).toBeVisible()
    }
  })
})
