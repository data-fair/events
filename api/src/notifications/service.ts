import type { Notification } from '#types'

import Debug from 'debug'
import i18n from 'i18n'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import log from '@data-fair/lib-node/log.js'
import { privateAxiosInstance } from '@data-fair/lib-node/axios.js'
import mongo from '#mongo'
import config from '#config'
import * as metrics from './metrics.js'
import * as pushService from '../push/service.ts'
import { MongoError } from 'mongodb'
import { buildNotificationMail, isSafeLink } from './operations.ts'

export { prepareSubscriptionNotification } from './operations.ts'

const debug = Debug('notifications')

const directoryUrl = config.privateDirectoryUrl

// the url comes from the producer of the event or from the url template of a subscription, and ends
// in a href: without it the notification stays readable, with a javascript: link it is an attack
export const dropUnsafeUrl = (notification: Notification) => {
  if (notification.url && !isSafeLink(notification.url)) {
    log.alert('a notification had an unsafe url, it was removed', { code: 'bad-notif-url', notificationId: notification._id, url: notification.url.slice(0, 1000) })
    delete notification.url
  }
  return notification
}

export const sendNotification = async (notification: Notification, skipInsert = false) => {
  // global.events.emit('saveNotification', notification)
  if (!skipInsert) {
    try {
      await mongo.notifications.insertOne(notification)
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        // conflict error, simply ignore this duplicate notification
        return
      } else {
        throw err
      }
    }
  }
  debug('Send WS notif', notification.recipient, notification)
  await wsEmitter.emit(`user:${notification.recipient.id}:notifications`, notification)
  if (notification.outputs && notification.outputs.includes('devices')) {
    debug('Send notif to devices')
    pushService.push(notification).catch((err: any) => { log.error('failed to push a notification to the devices', { code: 'notif-push', err, notificationId: notification._id }) })
  }
  if (notification.outputs && notification.outputs.includes('email')) {
    // global.events.emit('sentNotification', { output: 'email', notification })
    debug('Send notif to email address')
    const { invalidUrl, ...mailContent } = buildNotificationMail(notification, i18n.__({ phrase: 'seeAt', locale: notification.locale }))
    if (invalidUrl) {
      // comes from the event or from the url template of a subscription: not a failure, but a javascript: link is not an accident
      log.alert('a notification has a badly formatted or unsafe url', { code: 'bad-notif-url', notificationId: notification._id, url: notification.url?.slice(0, 1000) })
    }
    const mail = {
      to: [{ type: 'user', ...notification.recipient }],
      ...mailContent
    }
    debug('Send mail notif', notification.recipient, mail, notification)
    metrics.sentNotifications.inc({ output: 'mail' })
    privateAxiosInstance.post(directoryUrl + '/api/mails', mail, { headers: { 'x-secret-key': config.secretKeys.sendMails }, maxRedirects: 0 }).catch(err => {
      log.error('failed to send a notification mail', { code: 'notif-mail', err, notificationId: notification._id })
    })
  }
}
