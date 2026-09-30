import { expect, type Page } from '@playwright/test'
import { test } from './fixtures/login.ts'
import { axiosAuth, clean } from './support/axios.ts'

const pageUrl = (keys: string[], titles: string[]) =>
  `/events/embed/subscribe-webhooks?key=${keys.join(',')}&title=${titles.join(',')}&sender=user:test-user1`

const saveButton = (page: Page) => page.getByRole('button', { name: 'Enregistrer' }).first()

test.describe('Webhooks UI', () => {
  test.beforeEach(clean)

  test('creates a webhook on a chosen topic', async ({ page, goToWithAuth }) => {
    await goToWithAuth(pageUrl(['topic1', 'topic2'], ['TopicOne', 'TopicTwo']), 'test-user1')
    await page.getByText('Declare a new webhook').click()
    await expect(saveButton(page)).toBeDisabled()

    await page.getByLabel('Libellé').fill('My webhook')
    await page.getByLabel('URL').fill('https://example.com/hook')
    await saveButton(page).click()
    // several topics are proposed, none is preselected
    await expect(page.getByText('Ce paramètre est requis')).toBeVisible()

    await page.locator('.v-select').click()
    await page.getByRole('option', { name: 'TopicTwo' }).click()
    await saveButton(page).click()

    await expect(page.getByText('This webhook has not been called yet.')).toBeVisible()
    await expect(page.getByRole('button', { name: /My webhook\s*TopicTwo/ })).toBeVisible()
    await expect(saveButton(page)).toBeDisabled()
  })

  test('does not propose a topic selector for a single topic', async ({ page, goToWithAuth }) => {
    await goToWithAuth(pageUrl(['topic1'], ['TopicOne']), 'test-user1')
    await page.getByText('Declare a new webhook').click()
    await expect(page.getByLabel('Libellé')).toBeVisible()
    await expect(page.locator('.v-select')).toHaveCount(0)
  })

  test('edits an existing webhook', async ({ page, goToWithAuth }) => {
    const user1 = await axiosAuth('test-user1')
    await user1.post('/api/webhook-subscriptions', {
      title: 'Existing webhook',
      topic: { key: 'topic1', title: 'TopicOne' },
      sender: { type: 'user', id: 'test-user1' },
      url: 'https://example.com/hook'
    })

    await goToWithAuth(pageUrl(['topic1', 'topic2'], ['TopicOne', 'TopicTwo']), 'test-user1')
    await page.getByRole('button', { name: /Existing webhook/ }).click()
    await expect(saveButton(page)).toBeDisabled()

    await page.getByLabel('Libellé').first().fill('Renamed webhook')
    await expect(saveButton(page)).toBeEnabled()
    await page.locator('.v-select').first().click()
    await page.getByRole('option', { name: 'TopicTwo' }).click()
    const saved = page.waitForResponse(res => res.request().method() === 'POST' && res.url().endsWith('/webhook-subscriptions'))
    await saveButton(page).click()
    expect((await saved).status()).toBe(200)
    // the refreshed subscription (new "updated" date) is not a change to save
    await expect(page.getByRole('button', { name: /Renamed webhook\s*TopicTwo/ })).toBeVisible()
    await expect(saveButton(page)).toBeDisabled()

    const res = await user1.get('/api/webhook-subscriptions')
    expect(res.data.results).toHaveLength(1)
    expect(res.data.results[0].title).toBe('Renamed webhook')
    expect(res.data.results[0].topic.key).toBe('topic2')
  })

  test('deletes a webhook', async ({ page, goToWithAuth }) => {
    const user1 = await axiosAuth('test-user1')
    await user1.post('/api/webhook-subscriptions', {
      title: 'Doomed webhook',
      topic: { key: 'topic1', title: 'TopicOne' },
      sender: { type: 'user', id: 'test-user1' },
      url: 'https://example.com/hook'
    })

    await goToWithAuth(pageUrl(['topic1'], ['TopicOne']), 'test-user1')
    await page.getByRole('button', { name: /Doomed webhook/ }).click()
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    await expect(page.getByText('Doomed webhook')).toHaveCount(0)
    expect((await user1.get('/api/webhook-subscriptions')).data.count).toBe(0)
  })

  test('shows the progress of a test call without refreshing', async ({ page, goToWithAuth }) => {
    const user1 = await axiosAuth('test-user1')
    await user1.post('/api/webhook-subscriptions', {
      title: 'Tested webhook',
      topic: { key: 'topic1', title: 'TopicOne' },
      sender: { type: 'user', id: 'test-user1' },
      // nothing listens there, the delivery ends in error
      url: 'http://localhost:19898/closed'
    })

    await goToWithAuth(pageUrl(['topic1'], ['TopicOne']), 'test-user1')
    await page.getByRole('button', { name: /Tested webhook/ }).click()
    await expect(page.getByText('This webhook has not been called yet.')).toBeVisible()

    let listRequests = 0
    page.on('request', req => { if (req.url().includes('/api/webhooks?')) listRequests++ })
    await page.getByRole('button', { name: 'Test', exact: true }).click()
    await expect(page.getByText(/ - waiting| - working/)).toBeVisible()
    const listRequestsAfterTest = listRequests
    // the worker polls every 4s, its outcome is pushed over WS
    await expect(page.getByText(/ - error/)).toBeVisible({ timeout: 15000 })
    expect(listRequests).toBe(listRequestsAfterTest)
  })
})
