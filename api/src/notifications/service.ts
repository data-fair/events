import type { Notification } from '#types'

import Debug from 'debug'
import i18n from 'i18n'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import axios from '@data-fair/lib-node/axios.js'
import mongo from '#mongo'
import config from '#config'
import * as metrics from './metrics.js'
import * as pushService from '../push/service.ts'
import { MongoError } from 'mongodb'

export { prepareSubscriptionNotification } from './operations.ts'

const debug = Debug('notifications')

const directoryUrl = config.privateDirectoryUrl

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
    pushService.push(notification).catch((err: any) => { internalError('notif-push', err) })
  }
  if (notification.outputs && notification.outputs.includes('email')) {
    // global.events.emit('sentNotification', { output: 'email', notification })
    debug('Send notif to email address')
    let text = notification.body || notification.title || ''
    let simpleHtml = `<p>${notification.body || notification.title || ''}</p>`
    if (notification.url) {
      let parsedUrl
      try {
        parsedUrl = new URL(notification.url)
      } catch (err) {
        internalError('bad-notif-url', `notif ${notification._id} has badly formatted url ${notification.url}`)
      }
      if (parsedUrl) {
        text += '\n\n' + notification.url
        simpleHtml += `<p>${i18n.__({ phrase: 'seeAt', locale: notification.locale })} <a href="${notification.url}">${parsedUrl.host}</a></p>`
      }
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
