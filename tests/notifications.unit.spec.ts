import { test, expect } from '@playwright/test'
import { prepareSubscriptionNotification } from '../api/src/notifications/operations.ts'

const makeEvent = (overrides: any = {}) => ({
  _id: 'evt1',
  title: 'Event Title',
  topic: { key: 'topic1' },
  date: '2024-01-01',
  visibility: 'private' as const,
  ...overrides
})

const makeSubscription = (overrides: any = {}) => ({
  _id: 'sub1',
  origin: 'https://example.com',
  topic: { key: 'topic1' },
  recipient: { id: 'user1', name: 'User 1' },
  outputs: ['devices' as const],
  visibility: 'private' as const,
  created: { date: '2024-01-01' },
  updated: { date: '2024-01-01' },
  ...overrides
})

test.describe('prepareSubscriptionNotification', () => {
  test('basic notification structure', () => {
    const event = makeEvent()
    const sub = makeSubscription()
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'notif1')
    expect(notif._id).toBe('notif1')
    expect(notif.eventId).toBe('evt1')
    expect(notif.recipient).toEqual({ id: 'user1', name: 'User 1' })
    expect(notif.origin).toBe('https://example.com')
  })

  test('uses subscription icon', () => {
    const notif = prepareSubscriptionNotification(
      makeEvent(), makeSubscription({ icon: 'https://example.com/icon.png' }),
      { notificationIcon: 'https://default.com/icon.png' }, 'fr', 'n1'
    )
    expect(notif.icon).toBe('https://example.com/icon.png')
  })

  test('falls back to defaults.notificationIcon', () => {
    const notif = prepareSubscriptionNotification(
      makeEvent(), makeSubscription(),
      { notificationIcon: 'https://default.com/icon.png' }, 'fr', 'n1'
    )
    expect(notif.icon).toBe('https://default.com/icon.png')
  })

  test('falls back to origin-based icon', () => {
    const notif = prepareSubscriptionNotification(
      makeEvent(), makeSubscription(),
      {}, 'fr', 'n1'
    )
    expect(notif.icon).toBe('https://example.com/events/logo-192x192.png')
  })

  test('expands URL template', () => {
    const event = makeEvent({ urlParams: { id: '123', type: 'dataset' } })
    const sub = makeSubscription({ urlTemplate: '/resources/{type}/{id}' })
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect(notif.url).toBe('https://example.com/resources/dataset/123')
  })

  test('relative URL gets origin prepended', () => {
    const sub = makeSubscription({ urlTemplate: '/page' })
    const notif = prepareSubscriptionNotification(makeEvent(), sub, {}, 'fr', 'n1')
    expect(notif.url).toBe('https://example.com/page')
  })

  test('falls back topic title from subscription', () => {
    const event = makeEvent({ topic: { key: 'k' } })
    const sub = makeSubscription({ topic: { key: 'k', title: 'Sub Topic' } })
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect(notif.topic.title).toBe('Sub Topic')
  })

  test('uses topic title as fallback for notification title', () => {
    const event = makeEvent({ title: { fr: '', en: '' }, topic: { key: 'k' } })
    const sub = makeSubscription({ topic: { key: 'k', title: 'Topic Title' } })
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect(notif.title).toBe('Topic Title')
  })

  test('applies micro-template to body', () => {
    const event = makeEvent({ body: 'Hello from {hostname}' })
    const sub = makeSubscription()
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect(notif.body).toBe('Hello from example.com')
  })

  test('applies micro-template to htmlBody', () => {
    const event = makeEvent({ htmlBody: '<p>{origin}</p>' })
    const sub = makeSubscription()
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect(notif.htmlBody).toBe('<p>https://example.com</p>')
  })

  test('inherits outputs from subscription when not on event', () => {
    const event = makeEvent()
    const sub = makeSubscription({ outputs: ['email'] })
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect(notif.outputs).toEqual(['email'])
  })

  test('removes resource, originator, urlParams from notification', () => {
    const event = makeEvent({
      resource: { type: 'dataset', id: 'd1' },
      originator: { user: { id: 'u1' } },
      urlParams: { x: '1' }
    })
    const sub = makeSubscription()
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect((notif as any).resource).toBeUndefined()
    expect((notif as any).originator).toBeUndefined()
    expect((notif as any).urlParams).toBeUndefined()
  })

  test('localizes event with subscription locale', () => {
    const event = makeEvent({ title: { fr: 'Titre', en: 'Title' } })
    const sub = makeSubscription({ locale: 'en' })
    const notif = prepareSubscriptionNotification(event, sub, {}, 'fr', 'n1')
    expect(notif.title).toBe('Title')
  })
})
