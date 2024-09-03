import type { Db } from 'mongodb'
import type { Notification } from '../../../shared/types/index.ts'

import fs from 'fs-extra'
import webpush from 'web-push'
import PushNotifications from 'node-pushnotifications'
import dayjs from 'dayjs'
import Debug from 'debug'
import config from '../config.ts'
import mongo from '../mongo.ts'
import * as notificationsMetrics from '../notifications/metrics.js'
import * as metrics from './metrics.js'

const debug = Debug('notifications')

fs.ensureDirSync('./security')
let _vapidKeys
if (!fs.existsSync('./security/vapid.json')) {
  _vapidKeys = webpush.generateVAPIDKeys()
  fs.writeJsonSync('./security/vapid.json', _vapidKeys)
} else {
  _vapidKeys = fs.readJsonSync('./security/vapid.json')
}

export const vapidKeys = _vapidKeys

let pushNotifications: PushNotifications | null

export const init = async (db: Db) => {
  const settings: PushNotifications.Settings = {
    web: {
      vapidDetails: {
        subject: 'mailto:Koumoul <contact@koumoul.com>',
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      },
      gcmAPIKey: config.gcmAPIKey
    }
  }
  if (config.apn.token.key) {
    settings.apn = config.apn
  }
  pushNotifications = new PushNotifications(settings)
}

export const push = async (notification: Notification) => {
  if (!pushNotifications) throw new Error('pushNotifications was not initialized')

  const ownerFilter = { 'owner.type': 'user', 'owner.id': notification.recipient.id }
  const pushSub = await mongo.pushSubscriptions.findOne(ownerFilter)
  if (!pushSub) return []
  const errors = []
  for (const registration of pushSub.registrations) {
    if (registration.disabled) continue
    if (registration.disabledUntil) {
      if (registration.disabledUntil > dayjs().toISOString()) continue
      delete registration.disabledUntil
    }
    notificationsMetrics.sentNotifications.inc({ output: 'device-' + registration.type })

    const defaultPushNotif = config.defaultPushNotif[registration.type || 'webpush']
    const pushNotif: any = {
      ...notification,
      badge: config.theme.notificationBadge || (config.origin + '/events/badge-72x72.png'),
      ...defaultPushNotif
    }
    delete pushNotif.recipient
    const res = await pushNotifications.send([registration.id], pushNotif)
    debug('Send push notif', notification.recipient.id, registration, pushNotif, res[0])
    const errorMessage = res[0].message.find(m => !!m.error)
    if (errorMessage) {
      const error = errorMessage.error as any
      metrics.pushDeviceErrors.inc({ output: 'device-' + registration.type, statusCode: error.statusCode })
      errors.push(error)
      if (error.statusCode === 410) {
        console.log('registration has unsubscribed or expired, disable it', error.body || error.response || error.statusCode, JSON.stringify(registration))
        registration.disabled = 'gone' // cf https://developer.mozilla.org/fr/docs/Web/HTTP/Status/410
        delete registration.lastErrors
      } else {
        registration.lastErrors = registration.lastErrors || []
        registration.lastErrors.push(error?.statusCode ? error : error?.errorMsg)
        if (registration.lastErrors.length >= 10) {
          registration.disabled = 'errors'
          console.warn('registration returned too many errors, disable it', error, JSON.stringify(registration))
        } else {
          registration.disabledUntil = dayjs().add(Math.ceil(Math.pow(registration.lastErrors.length, 2.5)), 'minute').toISOString()
          console.warn('registration returned an error, progressively backoff', error, JSON.stringify(registration))
        }
      }
    } else {
      delete registration.lastErrors
      registration.lastSuccess = dayjs().toISOString()
    }
  }
  await mongo.pushSubscriptions.updateOne(ownerFilter, { $set: { registrations: pushSub.registrations } })
  return errors
}
