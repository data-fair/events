// use push-notifications to send notifications to devices
// by web push for now, using propriétary protocols for mobile devices later on

import type { DeviceRegistration } from '#types'

import { Router } from 'express'
import useragent from 'useragent'
import config from '#config'
import mongo from '#mongo'
import doc from '#doc'
import { nanoid } from 'nanoid'
import { session, reqOrigin } from '@data-fair/lib/express/index.js'
import { vapidKeys, push } from './service.ts'

const router = Router()
export default router

export function equalDeviceRegistrations (regId1: DeviceRegistration['id'] | null, regId2: DeviceRegistration['id'] | null) {
  if (regId1 === null || regId2 === null) return false
  if (typeof regId1 === 'string' && typeof regId2 === 'string' && regId1 === regId2) return true
  if (typeof regId1 === 'object' && typeof regId2 === 'object' && regId1.endpoint === regId2.endpoint) return true
  return false
}

router.get('/vapidkey', async (req, res) => {
  res.send({ publicKey: vapidKeys.publicKey })
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
  const { body } = doc.push.putRegistrationReq.returnValid(req, { name: 'req' })
  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  await mongo.pushSubscriptions.updateOne(ownerFilter, { $set: { registrations: body } })
  res.send(req.body)
})

// a shortcut to register current device
router.post('/registrations', async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
  const { body } = doc.push.postRegistrationReq.returnValid(req, { name: 'req' })
  const agent = useragent.parse(req.headers['user-agent'])
  const date = new Date().toISOString()
  const registration: DeviceRegistration = {
    type: 'webpush',
    deviceName: agent.toString(),
    ...body
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

  const existingRegistration = sub.registrations.find((r) => equalDeviceRegistrations(r.id, registration.id))
  if (existingRegistration) {
    delete existingRegistration.disabled
    delete existingRegistration.disabledUntil
    delete existingRegistration.lastErrors
  } else {
    sub.registrations.push(registration)
    const origin = reqOrigin(req)
    const errors = await push({
      _id: 'new-device',
      origin,
      topic: { key: 'new-device' },
      sender: { type: 'user', id: user.id },
      recipient: { id: user.id, name: user.name },
      title: 'Un nouvel appareil recevra vos notifications',
      body: `L'appareil ${registration.deviceName} est confirmé comme destinataire de vos notifications.`,
      date,
      icon: config.theme.notificationIcon || config.theme.logo || (origin + '/events/logo-192x192.png')
    }, { registrations: [registration] })
    if (errors.length) {
      return res.status(500).send(errors)
    } else {
      await mongo.pushSubscriptions.replaceOne(ownerFilter, sub, { upsert: true })
    }
  }
  res.send()
})
