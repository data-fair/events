// use push-notifications to send notifications to devices
// by web push for now, using propriétary protocols for mobile devices later on

import type { DeviceRegistration } from '#types'

import { Router } from 'express'
import useragent from 'useragent'
import config from '#config'
import mongo from '#mongo'
import Debug from 'debug'
import * as putRegistrationsReq from '#doc/push/put-registrations-req/index.ts'
import * as postRegistrationReq from '#doc/push/post-registration-req/index.ts'
import { nanoid } from 'nanoid'
import { session, reqSiteUrl, httpError } from '@data-fair/lib-express/index.js'
import { getPushState, push, pushToDevice } from './service.ts'

const debug = Debug('webpush')

const router = Router()
export default router

export function equalDeviceRegistrations (regId1: DeviceRegistration['id'] | null, regId2: DeviceRegistration['id'] | null) {
  if (regId1 === null || regId2 === null) return false
  if (typeof regId1 === 'string' && typeof regId2 === 'string' && regId1 === regId2) return true
  if (typeof regId1 === 'object' && typeof regId2 === 'object' && regId1.endpoint === regId2.endpoint) return true
  return false
}

router.get('/vapidkey', async (req, res) => {
  res.send({ publicKey: getPushState().vapidKeys.publicKey })
})

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
  res.send(req.body)
})

// a shortcut to register current device
router.post('/registrations', async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
  const { body } = postRegistrationReq.returnValid(req, { name: 'req' })
  const agent = useragent.parse(req.headers['user-agent'])
  const date = new Date().toISOString()
  const newRegistration: DeviceRegistration = {
    type: 'webpush',
    deviceName: agent.toString(),
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
      title: 'Un nouvel appareil recevra vos notifications',
      body: `L'appareil ${newRegistration.deviceName} est confirmé comme destinataire de vos notifications.`,
      date,
      icon: config.theme.notificationIcon || (origin + '/events/logo-192x192.png')
    }, newRegistration)
    if (error) return res.status(500).send(error)
    sub.registrations.push(newRegistration)
    await mongo.pushSubscriptions.replaceOne(ownerFilter, sub, { upsert: true })
    res.send(newRegistration)
  }
})

router.post('/registrations/:i/_test', async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
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
    title: 'Cet appareil est correctement configuré pour recevoir vos notifications',
    date: new Date().toISOString(),
    icon: config.theme.notificationIcon || (origin + '/events/logo-192x192.png')
  }, i)
  res.send({ error: errors[0] })
})
