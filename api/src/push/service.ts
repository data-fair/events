import type { DeviceRegistration, Notification } from '#types'

import webpush from 'web-push'
import dayjs from 'dayjs'
import Debug from 'debug'
import config from '#config'
import mongo from '#mongo'
import * as notificationsMetrics from '../notifications/metrics.js'
import * as metrics from './metrics.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import { backoffMinutes } from '../shared/operations.ts'

const debug = Debug('webpush')

let pushState: undefined | { vapidKeys: webpush.VapidKeys, webPushOptions: webpush.RequestOptions }
export const init = async () => {
  let vapidKeys = (await mongo.secrets.findOne({ _id: 'vapid-keys' }))?.data as webpush.VapidKeys | undefined
  if (!vapidKeys) {
    console.log('create new vapid keys for webpush notifications')
    vapidKeys = webpush.generateVAPIDKeys()
    await mongo.secrets.insertOne({ _id: 'vapid-keys', data: vapidKeys })
  } else {
    console.log('use existing vapid keys for webpush notifications')
  }

  console.log(`with gcmAPIKey ? ${!!config.gcmAPIKey}`)
  const webPushOptions: webpush.RequestOptions = {
    vapidDetails: {
      subject: 'mailto:Koumoul <contact@koumoul.com>',
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey
    },
    gcmAPIKey: config.gcmAPIKey,
    TTL: 60 * 60 * 24 * 4 // push service should store the message for 4 days
  }
  pushState = { vapidKeys, webPushOptions }
}
export const getPushState = () => {
  if (!pushState) throw new Error('missing pushService.init call ?')
  return pushState
}

export const pushToDevice = async (notification: Notification, registration: DeviceRegistration) => {
  const { webPushOptions } = getPushState()
  const defaultPushNotif = config.defaultPushNotif[registration.type || 'webpush']
  const pushNotif: any = {
    ...notification,
    badge: config.theme.notificationBadge || (notification.origin + '/events/badge-72x72.png'),
    ...defaultPushNotif
  }
  delete pushNotif.recipient
  // errors are returned, not thrown, the caller inspects statusCode to disable or backoff the registration
  let error: any
  try {
    // the schema requires `keys` on the registration id but leaves its properties commented out,
    // so the generated type does not model it and a direct cast is not enough
    await webpush.sendNotification(registration.id as unknown as webpush.PushSubscription, JSON.stringify(pushNotif), webPushOptions)
  } catch (err: any) {
    error = err
    error.errorMsg = err.message
  }
  debug('Send push notif', notification.recipient.id, registration, pushNotif, error)
  return error
}

export const push = async (notification: Notification, forceRegistrationIndex: number = -1) => {
  const ownerFilter = { 'owner.type': 'user', 'owner.id': notification.recipient.id }
  const pushSub = await mongo.pushSubscriptions.findOne(ownerFilter)
  if (!pushSub) return []
  const errors = []
  for (let i = 0; i < pushSub.registrations.length; i++) {
    const registration = pushSub.registrations[i]
    if (forceRegistrationIndex !== -1) {
      if (i !== forceRegistrationIndex) continue
    } else {
      if (registration.disabled) continue
      if (registration.disabledUntil) {
        if (registration.disabledUntil > dayjs().toISOString()) continue
      }
    }
    delete registration.disabledUntil
    notificationsMetrics.sentNotifications.inc({ output: 'device-' + registration.type })

    try {
      const error = await pushToDevice(notification, registration) as any
      if (error) {
        metrics.pushDeviceErrors.inc({ output: 'device-' + registration.type, statusCode: error.statusCode })
        errors.push(error)
        if (error.statusCode === 410) {
          console.warn('registration has unsubscribed or expired, disable it', error.body || error.response || error.statusCode, JSON.stringify(registration))
          registration.disabled = 'gone' // cf https://developer.mozilla.org/fr/docs/Web/HTTP/Status/410
          delete registration.lastErrors
        } else {
          registration.lastErrors = registration.lastErrors || []
          registration.lastErrors.push(error?.statusCode ? error : error?.errorMsg)
          if (registration.lastErrors.length >= 10) {
            registration.disabled = 'errors'
            console.warn('registration returned too many errors, disable it', error, JSON.stringify(registration))
          } else {
            delete registration.disabled
            registration.disabledUntil = dayjs().add(backoffMinutes(registration.lastErrors.length), 'minute').toISOString()
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
