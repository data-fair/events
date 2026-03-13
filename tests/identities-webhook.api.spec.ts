import type { Subscription } from '../api/types/index.js'

import { test, expect } from '@playwright/test'
import { axios, axiosAuth, clean } from './support/axios.ts'

const axIdentities = axios({ params: { key: 'SECRET_IDENTITIES' }, baseURL: 'http://localhost:8082/events' })
const user1 = await axiosAuth('user1@test.com')
const admin1 = await axiosAuth('admin1@test.com')

test.describe('identities webhooks', () => {
  test.beforeEach(clean)

  test('should update recipient and sender name', async () => {
    let subscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1', name: 'User1' },
      visibility: 'public'
    })).data

    await axIdentities.post('/api/identities/user/user1', { name: 'New name' })
    subscription = (await user1.get('/api/subscriptions/' + subscription._id)).data
    expect(subscription.recipient.name).toBe('New name')
    expect(subscription.sender.name).toBe('New name')
  })

  test('should remove deprecated private subscriptions', async () => {
    const privateSubscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'private'
    })).data
    expect(privateSubscription.visibility).toBe('private')

    const publicSubscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic2' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'public'
    })).data

    const org2Subscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic3' },
      sender: { type: 'organization', id: 'orga2', name: 'Orga 2', department: 'dep1' },
      visibility: 'private'
    })).data
    expect(org2Subscription.visibility).toBe('private')

    await axIdentities.post('/api/identities/user/user1', { name: 'New name', organizations: [{ id: 'orga2', role: 'user' }] })

    let subscriptions = (await user1.get('/api/subscriptions')).data.results as Subscription[]
    expect(subscriptions.find(s => s._id === privateSubscription._id)).toBeFalsy()
    expect(subscriptions.find(s => s._id === publicSubscription._id)).toBeTruthy()
    expect(subscriptions.find(s => s._id === org2Subscription._id)).toBeTruthy()

    await axIdentities.post('/api/identities/user/user1', { name: 'New name', organizations: [{ id: 'orga2', role: 'user', department: 'dep2' }] })
    subscriptions = (await user1.get('/api/subscriptions')).data.results
    expect(subscriptions.find(s => s._id === org2Subscription._id)).toBeFalsy()

    const allRolesSubscription = (await admin1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1' },
      visibility: 'private'
    })).data
    const adminSubscription = (await admin1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', name: 'Orga 1', role: 'admin' },
      visibility: 'private'
    })).data
    expect(adminSubscription.visibility).toBe('private')
    await axIdentities.post('/api/identities/user/admin1', { name: 'New name', organizations: [{ id: 'orga1', role: 'user' }] })
    subscriptions = (await admin1.get('/api/subscriptions')).data.results
    expect(subscriptions.find(s => s._id === allRolesSubscription._id)).toBeTruthy()
    expect(subscriptions.find(s => s._id === adminSubscription._id)).toBeFalsy()
  })
})
