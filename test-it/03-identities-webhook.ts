import type { Subscription } from '../shared/types/index.js'

import { strict as assert } from 'node:assert'
import { describe, it, before, beforeEach, after } from 'node:test'
import { axios, axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'

const axIdentities = axios({ params: { key: 'SECRET_IDENTITIES' }, baseURL: 'http://localhost:8082/events' })
const user1 = await axiosAuth('user1@test.com')
const admin1 = await axiosAuth('admin1@test.com')

describe('identities webhooks', () => {
  before(startApiServer)
  beforeEach(clean)
  after(stopApiServer)

  it('should update recipient and sender name', async () => {
    let subscription = (await user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1', name: 'User1' },
      visibility: 'public'
    })).data

    await axIdentities.post('/api/v1/identities/user/user1', { name: 'New name' })
    subscription = (await user1.get('/api/v1/subscriptions/' + subscription._id)).data
    assert.equal(subscription.recipient.name, 'New name')
    assert.equal(subscription.sender.name, 'New name')
  })

  it('should remove deprecated private subscriptions', async () => {
    const privateSubscription = (await user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'private'
    })).data
    assert.equal(privateSubscription.visibility, 'private')

    const publicSubscription = (await user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic2' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'public'
    })).data

    const org2Subscription = (await user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic3' },
      sender: { type: 'organization', id: 'orga2', name: 'Orga 2', department: 'dep1' },
      visibility: 'private'
    })).data
    assert.equal(org2Subscription.visibility, 'private')

    await axIdentities.post('/api/v1/identities/user/user1', { name: 'New name', organizations: [{ id: 'orga2', role: 'user' }] })

    let subscriptions = (await user1.get('/api/v1/subscriptions')).data.results as Subscription[]
    assert.ok(!subscriptions.find(s => s._id === privateSubscription._id))
    assert.ok(subscriptions.find(s => s._id === publicSubscription._id))
    assert.ok(subscriptions.find(s => s._id === org2Subscription._id))

    await axIdentities.post('/api/v1/identities/user/user1', { name: 'New name', organizations: [{ id: 'orga2', role: 'user', department: 'dep2' }] })
    subscriptions = (await user1.get('/api/v1/subscriptions')).data.results
    assert.ok(!subscriptions.find(s => s._id === org2Subscription._id))

    const allRolesSubscription = (await admin1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'private'
    })).data
    const adminSubscription = (await admin1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1', role: 'admin' },
      visibility: 'private'
    })).data
    assert.equal(adminSubscription.visibility, 'private')
    await axIdentities.post('/api/v1/identities/user/admin1', { name: 'New name', organizations: [{ id: 'orga1', role: 'user' }] })
    subscriptions = (await admin1.get('/api/v1/subscriptions')).data.results
    assert.ok(subscriptions.find(s => s._id === allRolesSubscription._id))
    assert.ok(!subscriptions.find(s => s._id === adminSubscription._id))
  })
})
