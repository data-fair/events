// use push-notifications to send notifications to devices
// by web push for now, using propriétary protocols for mobile devices later on

import type { DeviceRegistration } from '#types'

import { Router } from 'express'
import config from '#config'
import mongo from '#mongo'
import Debug from 'debug'
import * as putRegistrationsReq from '#doc/push/put-registrations-req/index.ts'
import * as postRegistrationReq from '#doc/push/post-registration-req/index.ts'
import { nanoid } from 'nanoid'
import log from '@data-fair/lib-node/log.js'
import { session, reqSiteUrl, httpError } from '@data-fair/lib-express/index.js'
import { getPushState, push, pushToDevice } from './service.ts'
import { equalDeviceRegistrations } from './operations.ts'
import { describeUserAgent } from '../shared/user-agent.ts'

const debug = Debug('webpush')

const router = Router()
export default router

router.get('/vapidkey', async (req, res) => {
  res.send({ publicKey: getPushState().vapidKeys.publicKey })
})

// the other routes read the session, cf the mounts in app.ts
router.use(session.middleware())

router.get('/registrations', async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  const sub = await mongo.pushSubscriptions.findOne(ownerFilter)
  const registrations = (sub && sub.registrations) || []
  registrations.forEach((r: any) => { r.type = r.type || 'webpush' })
  res.send(registrations)
})

router.put('/registrations', async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
  const { body } = putRegistrationsReq.returnValid(req, { name: 'req' })
  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  await mongo.pushSubscriptions.updateOne(ownerFilter, { $set: { registrations: body } })
  log.info('the device registrations were updated', { code: 'events.push.update', registrations: body.length })
  res.send(req.body)
})

// a shortcut to register current device
router.post('/registrations', async (req, res) => {
  const { user, lang } = await session.reqAuthenticated(req)
  const { body } = postRegistrationReq.returnValid(req, { name: 'req' })
  const date = new Date().toISOString()
  const newRegistration: DeviceRegistration = {
    type: 'webpush',
    deviceName: describeUserAgent(req.headers['user-agent']),
    ...body,
    date: new Date().toISOString()
  }

  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  let sub = await mongo.pushSubscriptions.findOne(ownerFilter)
  if (!sub) {
    sub = {
      _id: nanoid(),
      owner: { type: 'user', id: user.id, name: user.name },
      registrations: []
    }
  }

  const existingRegistration = sub.registrations.find((r) => equalDeviceRegistrations(r.id, newRegistration.id))
  if (existingRegistration) {
    debug('post was used to refresh an existing registration')
    delete existingRegistration.disabled
    delete existingRegistration.disabledUntil
    delete existingRegistration.lastErrors
    await mongo.pushSubscriptions.replaceOne(ownerFilter, sub, { upsert: true })
    res.send(existingRegistration)
  } else {
    debug('post was used to create a new regitration')
    const origin = reqSiteUrl(req)
    const error = await pushToDevice({
      _id: 'new-device',
      origin,
      topic: { key: 'new-device' },
      sender: { type: 'user', id: user.id, name: user.name },
      recipient: { id: user.id, name: user.name },
      title: lang === 'fr' ? 'Un nouvel appareil recevra vos notifications' : 'A new device will receive your notifications',
      body: lang === 'fr'
        ? `L'appareil ${newRegistration.deviceName} est confirmé comme destinataire de vos notifications.`
        : `The device ${newRegistration.deviceName} is confirmed as a recipient of your notifications.`,
      date,
      icon: config.theme.notificationIcon || (origin + '/events/logo-192x192.png')
    }, newRegistration)
    if (error) {
      log.warn('a new device refused its confirmation', { code: 'push-new-device', err: error, deviceName: newRegistration.deviceName })
      return res.status(500).send(error)
    }
    sub.registrations.push(newRegistration)
    await mongo.pushSubscriptions.replaceOne(ownerFilter, sub, { upsert: true })
    log.info('a device was registered', { code: 'events.push.register', deviceName: newRegistration.deviceName })
    res.send(newRegistration)
  }
})

router.post('/registrations/:i/_test', async (req, res) => {
  const { user, lang } = await session.reqAuthenticated(req)
  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  const sub = await mongo.pushSubscriptions.findOne(ownerFilter)
  if (!sub) throw httpError(404)
  const i = Number(req.params.i)
  if (isNaN(i)) throw httpError(400)
  const registration = sub.registrations[i]
  if (!registration) throw httpError(404)

  const origin = reqSiteUrl(req)
  const errors = await push({
    _id: 'test-device',
    origin,
    topic: { key: 'test-device' },
    sender: { type: 'user', id: user.id, name: user.name },
    recipient: { id: user.id, name: user.name },
    title: lang === 'fr' ? 'Cet appareil est correctement configuré pour recevoir vos notifications' : 'This device is correctly set up to receive your notifications',
    date: new Date().toISOString(),
    icon: config.theme.notificationIcon || (origin + '/events/logo-192x192.png')
  }, i)
  res.send({ error: errors[0] })
})
