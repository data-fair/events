// operations.ts — pure functions only
// must not import #mongo, #config, or store state

import type { Event, FullEvent, SearchableEvent, LocalizedEvent, Subscription } from '#types'
import type { Filter } from 'mongodb'
import type { SessionStateAuthenticated } from '@data-fair/lib-express'

export const localizeProp = (prop: Event['title'], locale: string, defaultLocale: string): string => {
  if (prop && typeof prop === 'object') return prop[locale] || prop[defaultLocale]
  return prop
}

export const localizeEvent = (event: FullEvent, locale: string, defaultLocale: string): LocalizedEvent => {
  return {
    ...event,
    title: localizeProp(event.title, locale, defaultLocale),
    body: event.body && localizeProp(event.body, locale, defaultLocale),
    htmlBody: event.htmlBody && localizeProp(event.htmlBody, locale, defaultLocale)
  }
}

export const getSubscriptionsFilter = (event: Event): Filter<Subscription> => {
  const topicParts = event.topic.key.split(':')
  const topicKeys = topicParts.map((part, i) => topicParts.slice(0, i + 1).join(':'))
  const subscriptionsFilter: Filter<Subscription> = { 'topic.key': { $in: topicKeys } }
  if (event.subscribedRecipient) {
    subscriptionsFilter['recipient.id'] = event.subscribedRecipient.id
  } else if (event.visibility === 'private') {
    subscriptionsFilter.visibility = 'private'
  }
  if (event.sender) {
    subscriptionsFilter['sender.type'] = event.sender.type
    subscriptionsFilter['sender.id'] = event.sender.id
    if (event.sender.role) subscriptionsFilter['sender.role'] = event.sender.role
    if (event.sender.department) {
      if (event.sender.department !== '*') {
        subscriptionsFilter['sender.department'] = event.sender.department
      }
    } else {
      subscriptionsFilter['sender.department'] = { $exists: false }
    }
  } else {
    subscriptionsFilter.sender = { $exists: false }
  }

  return subscriptionsFilter
}

export const cleanEvent = (event: LocalizedEvent, sessionState: SessionStateAuthenticated) => {
  // hide the user if the event is sent from another organization
  if (event.originator) {
    if (sessionState.account.type === event.sender?.type && sessionState.account.id === event.sender.id) {
      if (event.originator.organization) {
        if (sessionState.organization?.id !== event.originator.organization.id) {
          delete event.originator.user
        }
      }
    }
  }

  // anonymize the user if the event is sent from a super admin
  if (event.originator?.user?.admin && !sessionState.user?.adminMode) {
    event.originator.user = { admin: true }
  }
  return event
}

export const buildSearchTexts = (event: SearchableEvent, locales: string[], defaultLocale: string): SearchableEvent['_search'] => {
  const search: SearchableEvent['_search'] = []
  for (const locale of locales) {
    const localizedEvent = localizeEvent(event, locale, defaultLocale)
    const searchParts: (string | undefined)[] = [...event.topic.key.split(':'), event.topic.title, localizedEvent.title, localizedEvent.body, event.sender?.id, event.sender?.name]
    if (event.originator) {
      if (event.originator.organization) {
        searchParts.push(event.originator.organization.name, event.originator.organization.id)
      }
      if (event.originator.user && (!event.originator.organization || (event.sender?.type === 'organization' && event.sender.id === event.originator.organization.id))) {
        searchParts.push(event.originator.user.name, event.originator.user.id)
      }
    }
    search.push({ language: locale, text: searchParts.filter(Boolean).join(' ') })
  }
  return search
}
