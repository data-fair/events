import type { FullEvent, Notification, Subscription } from '#types'

import { parseTemplate } from 'url-template'
import { nanoid } from 'nanoid'
import Debug from 'debug'
import i18n from 'i18n'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import axios from '@data-fair/lib-node/axios.js'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import mongo from '#mongo'
import config from '#config'
import * as metrics from './metrics.js'
import { localizeEvent } from '../events/service.ts'
import * as pushService from '../push/service.ts'

const debug = Debug('notifications')

const directoryUrl = config.privateDirectoryUrl

export const prepareSubscriptionNotification = (event: FullEvent, subscription: Subscription): Notification => {
  const localizedEvent = localizeEvent(event, subscription.locale)
  delete localizedEvent.urlParams
  const notification: Notification = {
    icon: subscription.icon || config.theme.notificationIcon || config.theme.logo || (subscription.origin + '/events/logo-192x192.png'),
    locale: subscription.locale,
    ...localizedEvent,
    _id: nanoid(),
    recipient: subscription.recipient,
    origin: subscription.origin
  }
  if (subscription.outputs && (!notification.outputs || !notification.outputs.length)) {
    notification.outputs = subscription.outputs
  }
  if (subscription.urlTemplate) {
    notification.url = parseTemplate(subscription.urlTemplate).expand(event.urlParams || {})
  }
  if (!notification.topic.title && subscription.topic.title) {
    notification.topic.title = subscription.topic.title
  }

  const templateParams = { origin: subscription.origin, hostname: new URL(subscription.origin).hostname }
  if (notification.body) notification.body = microTemplate(notification.body, templateParams)
  if (notification.htmlBody) notification.htmlBody = microTemplate(notification.htmlBody, templateParams)

  return notification
}

export const sendNotification = async (notification: Notification, skipInsert = false) => {
  // global.events.emit('saveNotification', notification)
  if (!skipInsert) await mongo.notifications.insertOne(notification)
  debug('Send WS notif', notification.recipient, notification)
  await wsEmitter.emit(`user:${notification.recipient.id}:notifications`, notification)
  if (notification.outputs && notification.outputs.includes('devices')) {
    debug('Send notif to devices')
    pushService.push(notification).catch((err: any) => { internalError('notif-push', err) })
  }
  if (notification.outputs && notification.outputs.includes('email')) {
    // global.events.emit('sentNotification', { output: 'email', notification })
    debug('Send notif to email address')
    let text = notification.body || ''
    let simpleHtml = `<p>${notification.body || ''}</p>`
    if (notification.url) {
      text += '\n\n' + notification.url
      simpleHtml += `<p>${i18n.__({ phrase: 'seeAt', locale: notification.locale })} <a href="${notification.url}">${new URL(notification.url).host}</a></p>`
    }
    const mail = {
      to: [{ type: 'user', ...notification.recipient }],
      subject: notification.title,
      text,
      html: notification.htmlBody || simpleHtml
    }
    debug('Send mail notif', notification.recipient, mail, notification)
    metrics.sentNotifications.inc({ output: 'mail' })
    axios.post(directoryUrl + '/api/mails', mail, { params: { key: config.secretKeys.sendMails } }).catch(err => {
      internalError('notif-mail', err)
    })
  }
}
