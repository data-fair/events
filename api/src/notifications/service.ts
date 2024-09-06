import type { Event, Notification, Subscription } from '#shared/types/index.ts'
import type { Filter } from 'mongodb'

import { parseTemplate } from 'url-template'
import { nanoid } from 'nanoid'
import Debug from 'debug'
import i18n from 'i18n'
import * as wsEmitter from '@data-fair/lib/node/ws-emitter.js'
import { internalError } from '@data-fair/lib/node/observer.js'
import axios from '@data-fair/lib/node/axios.js'
import mongo from '#mongo'
import config from '#config'
import * as metrics from './metrics.js'
import { localizeEvent } from '../events/service.ts'
import * as pushService from '../push/service.ts'

const debug = Debug('notifications')

const directoryUrl = config.privateDirectoryUrl || config.origin + '/simple-directory'

export const receiveEvent = async (event: Event) => {
  // prepare the filter to find the topics matching this subscription
  const topicParts = event.topic.key.split(':')
  const topicKeys = topicParts.map((part, i) => topicParts.slice(0, i + 1).join(':'))
  const subscriptionsFilter: Filter<Subscription> = { 'topic.key': { $in: topicKeys } }
  if (event.visibility === 'private') subscriptionsFilter.visibility = 'private'
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
  for await (const subscription of mongo.subscriptions.find(subscriptionsFilter)) {
    await sendNotification(prepareSubscriptionNotification(event, subscription))
  }
}

const prepareSubscriptionNotification = (event: Event, subscription: Subscription): Notification => {
  const localizedEvent = localizeEvent(event, subscription.locale)
  delete localizedEvent.urlParams
  const notification: Notification = {
    icon: subscription.icon || config.theme.notificationIcon || config.theme.logo || (config.origin + '/events/logo-192x192.png'),
    locale: subscription.locale,
    ...localizedEvent,
    _id: nanoid(),
    recipient: subscription.recipient
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
  return notification
}

const sendNotification = async (notification: Notification) => {
  // global.events.emit('saveNotification', notification)
  await mongo.notifications.insertOne(notification)
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
