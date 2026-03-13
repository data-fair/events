// operations.ts — pure functions only
// must not import #mongo, #config, or store state

import type { FullEvent, Notification, Subscription } from '#types'

import { parseTemplate } from 'url-template'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { localizeEvent } from '../events/operations.ts'

interface PrepareDefaults {
  notificationIcon?: string
}

export const prepareSubscriptionNotification = (event: FullEvent, subscription: Subscription, defaults: PrepareDefaults, defaultLocale: string, id: string): Notification => {
  const localizedEvent = localizeEvent(event, subscription.locale || defaultLocale, defaultLocale)
  delete localizedEvent.resource
  delete localizedEvent.originator
  delete localizedEvent.urlParams
  const notification: Notification = {
    eventId: event._id,
    icon: subscription.icon || defaults.notificationIcon || (subscription.origin + '/events/logo-192x192.png'),
    locale: subscription.locale,
    ...localizedEvent,
    _id: id,
    recipient: subscription.recipient,
    origin: subscription.origin
  }
  if (subscription.outputs && (!notification.outputs || !notification.outputs.length)) {
    notification.outputs = subscription.outputs
  }
  if (subscription.urlTemplate) {
    notification.url = parseTemplate(subscription.urlTemplate).expand(event.urlParams || {})
    if (notification.url.startsWith('/') && subscription.origin) notification.url = subscription.origin + notification.url
  }
  if (!notification.topic.title && subscription.topic.title) {
    notification.topic.title = subscription.topic.title
  }
  if (!notification.title && notification.topic.title) {
    notification.title = notification.topic.title
  }

  const templateParams = { origin: subscription.origin, hostname: new URL(subscription.origin).hostname }
  if (notification.body) notification.body = microTemplate(notification.body, templateParams)
  if (notification.htmlBody) notification.htmlBody = microTemplate(notification.htmlBody, templateParams)

  return notification
}
