import { resolve } from 'node:path'
import type { DeviceRegistration, Notification } from '#types'
import type { RegistrationId } from 'node-pushnotifications'

import fs from 'fs-extra'
import webpush from 'web-push'
import PushNotifications from 'node-pushnotifications'
import dayjs from 'dayjs'
import Debug from 'debug'
import config from '#config'
import mongo from '#mongo'
import * as notificationsMetrics from '../notifications/metrics.js'
import * as metrics from './metrics.js'
import { internalError } from '@data-fair/lib-node/observer.js'

const debug = Debug('notifications')

const securityDir = resolve(import.meta.dirname, '../../../security')

fs.ensureDirSync(securityDir)
let _vapidKeys
if (!fs.existsSync(securityDir + '/vapid.json')) {
  _vapidKeys = webpush.generateVAPIDKeys()
  fs.writeJsonSync(securityDir + '/vapid.json', _vapidKeys)
} else {
  _vapidKeys = fs.readJsonSync(securityDir + '/vapid.json')
}

export const vapidKeys = _vapidKeys

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
const pushNotifications = new PushNotifications(settings)

export const push = async (notification: Notification, pushSub: { registrations: DeviceRegistration[] } | null = null) => {
  if (!pushNotifications) throw new Error('pushNotifications was not initialized')

  const ownerFilter = { 'owner.type': 'user', 'owner.id': notification.recipient.id }
  pushSub = pushSub ?? await mongo.pushSubscriptions.findOne(ownerFilter)
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
      badge: config.theme.notificationBadge || (notification.origin + '/events/badge-72x72.png'),
      ...defaultPushNotif
    }
    delete pushNotif.recipient
    try {
      const res = await pushNotifications.send([registration.id as RegistrationId], pushNotif)
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
    } catch (err) {
      internalError('notif-push', err)
    }
  }
  await mongo.pushSubscriptions.updateOne(ownerFilter, { $set: { registrations: pushSub.registrations } })
  return errors
}
