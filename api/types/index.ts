import type { Event } from '@data-fair/lib-common-types/event/index.js'

export type { Subscription } from './subscription/index.js'
export type { Notification } from './notification/index.js'
export type { Webhook } from './webhook/index.js'
export type { WebhookSubscription } from './webhook-subscription/index.js'
export type { Event }
export type { DevicesPushSubscription } from './push-subscription/index.js'
export type { DeviceRegistration } from './device-registration/index.js'

export type FullEvent = Event & Required<Pick<Event, 'visibility'>> & { _id: string }
export type LocalizedEvent = Omit<FullEvent, 'title' | 'body' | 'htmlBody'> & { title: string, body?: string, htmlBody?: string }
export type SearchableEvent = FullEvent & { _search: { language: string, text: string }[] }
