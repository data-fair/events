// unauthenticated and destructive: only mounted in development, by a dynamic import in app.ts

import { Router } from 'express'
import mongo from '#mongo'

const router = Router()
export default router

// Prefixed test sub-spaces: a test suite owns the accounts whose ids start with its own prefix (test_<suite>_)
// and what they own here, cleaned without touching the other suites nor the unprefixed accounts
const testPrefixRegexp = /^test_[a-z0-9]+(?:_[a-z0-9]+)*_$/

// DELETE /?prefix=test_<suite>_: the notifications, subscriptions, events, webhooks and push registrations of
// the accounts whose ids start with the prefix
router.delete('', async (req, res) => {
  const prefix = req.query.prefix
  if (typeof prefix !== 'string' || !testPrefixRegexp.test(prefix)) {
    res.status(400).send('invalid test prefix')
    return
  }
  // the prefix only holds [a-z0-9_], safe in a regexp
  const testFilter = new RegExp('^' + prefix)
  for (const name of ['notifications', 'subscriptions']) {
    await mongo.db.collection(name).deleteMany({ 'recipient.id': testFilter })
  }
  await mongo.db.collection('events').deleteMany({ 'sender.id': testFilter })
  for (const name of ['webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
    await mongo.db.collection(name).deleteMany({ 'owner.id': testFilter })
  }
  res.status(204).send()
})

router.post('/:collection', async (req, res) => {
  await mongo.db.collection(req.params.collection).insertOne(req.body)
  res.send()
})

router.get('/:collection/:id', async (req, res) => {
  const doc = await mongo.db.collection(req.params.collection).findOne({ _id: req.params.id as any })
  res.json(doc)
})
