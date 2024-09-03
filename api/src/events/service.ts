import type { Event, LocalizedEvent } from '../../../shared/types/index.ts'
import config from '../config.ts'

const localizeProp = (prop: Event['title'], locale: string): string => {
  if (prop && typeof prop === 'object') return prop[locale] || prop[config.i18n.defaultLocale]
  return prop
}

export const localizeEvent = (event: Event, locale: string = config.i18n.defaultLocale): LocalizedEvent => {
  const localizedEvent: LocalizedEvent = {
    ...event,
    title: localizeProp(event.title, locale),
    body: event.body && localizeProp(event.body, locale),
    htmlBody: event.htmlBody && localizeProp(event.htmlBody, locale)
  }
  return localizedEvent
}
