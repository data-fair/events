import { expect } from '@playwright/test'
import { test as setup } from './fixtures/login.ts'

// The first hit on each Vite dev route triggers an on-demand compile that can
// exceed the per-test timeout. Warming the heavy routes once here keeps the
// individual e2e specs fast and reliable.
setup('warmup heavy dev routes', async ({ page, goToWithAuth }) => {
  // /events/dev hosts the notification-queue component, the heaviest first compile
  await goToWithAuth('/events/dev', 'test-user1')
  await expect(page.getByRole('button', { name: 'Open notification list' })).toBeVisible({ timeout: 60_000 })

  // embed routes exercised by the other e2e specs
  for (const route of ['/events/embed/events', '/events/embed/notifications', '/events/embed/subscriptions']) {
    await goToWithAuth(route, 'test-user1')
  }
})
