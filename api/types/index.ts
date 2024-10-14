import type { Event } from './event/index.js'

export type { Subscription } from './subscription/index.js'
export type { Notification } from './notification/index.js'
export type { Webhook } from './webhook/index.js'
export type { WebhookSubscription } from './webhook-subscription/index.js'
export type { Event } from './event/index.js'
export type { DevicesPushSubscription } from './push-subscription/index.js'
export type { DeviceRegistration } from './device-registration/index.js'

export type LocalizedEvent = Omit<Event, 'title' | 'body' | 'htmlBody'> & { title: string, body?: string, htmlBody?: string }

export type SearchableEvent = Event & { _search: { language: string, text: string }[] }
