// use push-notifications to send notifications to devices
// by web push for now, using propriétary protocols for mobile devices later on

import useragent from 'useragent'
import config from '../config.ts'
import { asyncHandler, session } from '@data-fair/lib/express/index.js'
import { vapidKeys, push } from './service.ts'

const router = require('express').Router()
export default router

const equalReg = (reg1: any, reg2: any) => {
  const val1 = typeof reg1 === 'object' ? reg1.endpoint : reg1
  const val2 = typeof reg2 === 'object' ? reg2.endpoint : reg2
  return val1 === val2
}

router.get('/vapidkey', asyncHandler(async (req, res) => {
  res.send({ publicKey: vapidKeys.publicKey })
}))

router.get('/registrations', asyncHandler(async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
  const db = await req.app.get('db')
  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  const sub = await db.collection('pushSubscriptions').findOne(ownerFilter)
  const registrations = (sub && sub.registrations) || []
  registrations.forEach((r: any) => { r.type = r.type || 'webpush' })
  res.send(registrations)
}))

router.put('/registrations', asyncHandler(async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
  const db = await req.app.get('db')
  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  await db.collection('pushSubscriptions').updateOne(ownerFilter, { $set: { registrations: req.body } })
  res.send(req.body)
}))

// a shortcut to register current device
router.post('/registrations', asyncHandler(async (req, res) => {
  const { user } = await session.reqAuthenticated(req)
  if (!req.body.id) return res.status(400).send('id is required')
  const db = await req.app.get('db')
  const agent = useragent.parse(req.headers['user-agent'])
  const date = new Date().toISOString()
  const registration = { ...req.body, date }
  if (!registration.type) registration.type = 'webpush'
  if (!registration.deviceName) registration.deviceName = agent.toString()

  const ownerFilter = { 'owner.type': 'user', 'owner.id': user.id }
  let sub = await db.collection('pushSubscriptions').findOne(ownerFilter)
  if (!sub) {
    sub = {
      owner: { type: 'user', id: user.id, name: user.name },
      registrations: []
    }
  }
  if (!sub.registrations.find((r: any) => equalReg(r.id, req.body.id))) {
    sub.registrations.push(registration)
    await db.collection('pushSubscriptions').replaceOne(ownerFilter, sub, { upsert: true })
    const errors = await push({
      _id: 'new-device',
      topic: { key: 'new-device' },
      sender: { type: 'user', id: user.id },
      recipient: { id: user.id, name: user.name },
      title: 'Un nouvel appareil recevra vos notifications',
      body: `L'appareil ${registration.deviceName} est confirmé comme destinataire de vos notifications.`,
      date,
      icon: config.theme.notificationIcon || config.theme.logo || (config.origin + '/events/logo-192x192.png')
    })
    if (errors.length) return res.status(500).send(errors)
  }
  res.send()
}))
