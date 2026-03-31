import { test, expect } from '@playwright/test'
import { localizeProp, localizeEvent, getSubscriptionsFilter, cleanEvent, buildSearchTexts } from '../api/src/events/operations.ts'

test.describe('localizeProp', () => {
  test('returns string prop as-is', () => {
    expect(localizeProp('hello', 'fr', 'fr')).toBe('hello')
  })

  test('returns matching locale from object', () => {
    expect(localizeProp({ fr: 'bonjour', en: 'hello' }, 'en', 'fr')).toBe('hello')
  })

  test('falls back to defaultLocale when locale not found', () => {
    expect(localizeProp({ fr: 'bonjour' }, 'en', 'fr')).toBe('bonjour')
  })
})

test.describe('localizeEvent', () => {
  test('localizes title, body and htmlBody', () => {
    const event: any = {
      _id: 'e1',
      title: { fr: 'Titre', en: 'Title' },
      body: { fr: 'Corps', en: 'Body' },
      htmlBody: { fr: '<b>Corps</b>', en: '<b>Body</b>' },
      topic: { key: 'k' },
      date: '2024-01-01',
      visibility: 'private'
    }
    const localized = localizeEvent(event, 'en', 'fr')
    expect(localized.title).toBe('Title')
    expect(localized.body).toBe('Body')
    expect(localized.htmlBody).toBe('<b>Body</b>')
  })

  test('handles string title', () => {
    const event: any = {
      _id: 'e1',
      title: 'Simple',
      topic: { key: 'k' },
      date: '2024-01-01',
      visibility: 'private'
    }
    const localized = localizeEvent(event, 'en', 'fr')
    expect(localized.title).toBe('Simple')
  })
})

test.describe('getSubscriptionsFilter', () => {
  test('builds topic hierarchy filter', () => {
    const event: any = {
      topic: { key: 'a:b:c' },
    }
    const filter = getSubscriptionsFilter(event)
    expect(filter['topic.key']).toEqual({ $in: ['a', 'a:b', 'a:b:c'] })
  })

  test('filters by sender', () => {
    const event: any = {
      topic: { key: 't' },
      sender: { type: 'organization', id: 'org1', name: 'Org' }
    }
    const filter = getSubscriptionsFilter(event)
    expect(filter['sender.type']).toBe('organization')
    expect(filter['sender.id']).toBe('org1')
    expect(filter['sender.department']).toEqual({ $exists: false })
  })

  test('filters by sender with department', () => {
    const event: any = {
      topic: { key: 't' },
      sender: { type: 'organization', id: 'org1', department: 'dep1' }
    }
    const filter = getSubscriptionsFilter(event)
    expect(filter['sender.department']).toBe('dep1')
  })

  test('wildcard department does not filter', () => {
    const event: any = {
      topic: { key: 't' },
      sender: { type: 'organization', id: 'org1', department: '*' }
    }
    const filter = getSubscriptionsFilter(event)
    expect(filter['sender.department']).toBeUndefined()
  })

  test('filters by sender role', () => {
    const event: any = {
      topic: { key: 't' },
      sender: { type: 'organization', id: 'org1', role: 'admin' }
    }
    const filter = getSubscriptionsFilter(event)
    expect(filter['sender.role']).toBe('admin')
  })

  test('no sender requires sender absent', () => {
    const event: any = { topic: { key: 't' } }
    const filter = getSubscriptionsFilter(event)
    expect(filter.sender).toEqual({ $exists: false })
  })

  test('private visibility sets visibility filter', () => {
    const event: any = { topic: { key: 't' }, visibility: 'private' }
    const filter = getSubscriptionsFilter(event)
    expect(filter.visibility).toBe('private')
  })

  test('subscribedRecipient sets recipient filter', () => {
    const event: any = {
      topic: { key: 't' },
      subscribedRecipient: { id: 'test-user1' }
    }
    const filter = getSubscriptionsFilter(event)
    expect(filter['recipient.id']).toBe('test-user1')
  })
})

test.describe('cleanEvent', () => {
  test('hides originator user from another org', () => {
    const event: any = {
      sender: { type: 'organization', id: 'org1' },
      originator: {
        organization: { id: 'org-other', name: 'Other' },
        user: { id: 'u1', name: 'User 1' }
      }
    }
    const session: any = {
      account: { type: 'organization', id: 'org1' },
      organization: { id: 'org1' }
    }
    const result = cleanEvent(event, session)
    expect(result.originator!.user).toBeUndefined()
  })

  test('keeps originator user from same org', () => {
    const event: any = {
      sender: { type: 'organization', id: 'org1' },
      originator: {
        organization: { id: 'org1', name: 'Org' },
        user: { id: 'u1', name: 'User 1' }
      }
    }
    const session: any = {
      account: { type: 'organization', id: 'org1' },
      organization: { id: 'org1' }
    }
    const result = cleanEvent(event, session)
    expect(result.originator!.user).toEqual({ id: 'u1', name: 'User 1' })
  })

  test('anonymizes admin originator for non-admin viewer', () => {
    const event: any = {
      originator: {
        user: { id: 'u1', name: 'Admin', admin: true }
      }
    }
    const session: any = {
      account: { type: 'user', id: 'u2' },
      user: { adminMode: false }
    }
    const result = cleanEvent(event, session)
    expect(result.originator!.user).toEqual({ admin: true })
  })

  test('keeps admin originator for admin viewer', () => {
    const event: any = {
      originator: {
        user: { id: 'u1', name: 'Admin', admin: true }
      }
    }
    const session: any = {
      account: { type: 'user', id: 'u2' },
      user: { adminMode: true }
    }
    const result = cleanEvent(event, session)
    expect(result.originator!.user).toEqual({ id: 'u1', name: 'Admin', admin: true })
  })
})

test.describe('buildSearchTexts', () => {
  test('builds search text for each locale', () => {
    const event: any = {
      _id: 'e1',
      title: { fr: 'Titre', en: 'Title' },
      body: { fr: 'Corps', en: 'Body' },
      topic: { key: 'a:b', title: 'Topic' },
      date: '2024-01-01',
      visibility: 'private',
      _search: [],
      sender: { type: 'user', id: 'test-user1', name: 'User 1' }
    }
    const result = buildSearchTexts(event, ['fr', 'en'], 'fr')
    expect(result).toHaveLength(2)
    expect(result[0].language).toBe('fr')
    expect(result[0].text).toContain('Titre')
    expect(result[0].text).toContain('Topic')
    expect(result[0].text).toContain('test-user1')
    expect(result[1].language).toBe('en')
    expect(result[1].text).toContain('Title')
  })

  test('includes originator info when same org as sender', () => {
    const event: any = {
      _id: 'e1',
      title: 'T',
      topic: { key: 'k' },
      date: '2024-01-01',
      visibility: 'private',
      _search: [],
      sender: { type: 'organization', id: 'org1' },
      originator: {
        organization: { id: 'org1', name: 'Org 1' },
        user: { id: 'u1', name: 'User 1' }
      }
    }
    const result = buildSearchTexts(event, ['fr'], 'fr')
    expect(result[0].text).toContain('Org 1')
    expect(result[0].text).toContain('User 1')
  })

  test('excludes user when originator is from different org', () => {
    const event: any = {
      _id: 'e1',
      title: 'T',
      topic: { key: 'k' },
      date: '2024-01-01',
      visibility: 'private',
      _search: [],
      sender: { type: 'organization', id: 'org1' },
      originator: {
        organization: { id: 'org-other', name: 'Other Org' },
        user: { id: 'u1', name: 'User 1' }
      }
    }
    const result = buildSearchTexts(event, ['fr'], 'fr')
    expect(result[0].text).toContain('Other Org')
    expect(result[0].text).not.toContain('User 1')
  })
})
