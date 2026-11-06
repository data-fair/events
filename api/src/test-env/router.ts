// unauthenticated and destructive: only mounted in development, by a dynamic import in app.ts

import { Router } from 'express'
import mongo from '#mongo'

const router = Router()
export default router

router.delete('', async (req, res) => {
  const testFilter = /^test/
  for (const name of ['notifications', 'subscriptions']) {
    await mongo.db.collection(name).deleteMany({ 'recipient.id': testFilter })
  }
  await mongo.db.collection('events').deleteMany({ 'sender.id': testFilter })
  for (const name of ['webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
    await mongo.db.collection(name).deleteMany({ 'owner.id': testFilter })
  }
  res.send()
})

router.post('/:collection', async (req, res) => {
  await mongo.db.collection(req.params.collection).insertOne(req.body)
  res.send()
})

router.get('/:collection/:id', async (req, res) => {
  const doc = await mongo.db.collection(req.params.collection).findOne({ _id: req.params.id as any })
  res.json(doc)
})
