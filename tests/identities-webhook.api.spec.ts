import type { Subscription } from '../api/types/index.js'

import { test, expect } from '@playwright/test'
import { axios, axiosAuth, clean, devBaseURL } from './support/axios.ts'

const axIdentities = axios({ params: { key: 'SECRET_IDENTITIES' }, baseURL: devBaseURL })
const axPush = axios({ params: { key: 'SECRET_EVENTS' }, baseURL: devBaseURL })
const user1 = await axiosAuth('test-user1')
const admin1 = await axiosAuth('test1-admin1')
admin1.setOrg('test1')

test.describe('identities webhooks', () => {
  test.beforeEach(clean)

  test('should update recipient and sender name', async () => {
    let subscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'test-user1', name: 'User1' },
      visibility: 'public'
    })).data

    await axIdentities.post('/api/identities/user/test-user1', { name: 'New name' })
    subscription = (await user1.get('/api/subscriptions/' + subscription._id)).data
    expect(subscription.recipient.name).toBe('New name')
    expect(subscription.sender.name).toBe('New name')
  })

  test('should remove deprecated private subscriptions', async () => {
    const privateSubscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
      visibility: 'private'
    })).data
    expect(privateSubscription.visibility).toBe('private')

    const publicSubscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic2' },
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
      visibility: 'public'
    })).data

    const org2Subscription = (await user1.post('/api/subscriptions', {
      topic: { key: 'topic3' },
      sender: { type: 'organization', id: 'test2', name: 'Test Organization 2', department: 'dep1' },
      visibility: 'private'
    })).data
    expect(org2Subscription.visibility).toBe('private')

    await axIdentities.post('/api/identities/user/test-user1', { name: 'New name', organizations: [{ id: 'test2', role: 'user' }] })

    let subscriptions = (await user1.get('/api/subscriptions')).data.results as Subscription[]
    expect(subscriptions.find(s => s._id === privateSubscription._id)).toBeFalsy()
    expect(subscriptions.find(s => s._id === publicSubscription._id)).toBeTruthy()
    expect(subscriptions.find(s => s._id === org2Subscription._id)).toBeTruthy()

    await axIdentities.post('/api/identities/user/test-user1', { name: 'New name', organizations: [{ id: 'test2', role: 'user', department: 'dep2' }] })
    subscriptions = (await user1.get('/api/subscriptions')).data.results
    expect(subscriptions.find(s => s._id === org2Subscription._id)).toBeFalsy()

    const allRolesSubscription = (await admin1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
      visibility: 'private'
    })).data
    const adminSubscription = (await admin1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1', role: 'admin' },
      visibility: 'private'
    })).data
    expect(adminSubscription.visibility).toBe('private')
    await axIdentities.post('/api/identities/user/test1-admin1', { name: 'New name', organizations: [{ id: 'test1', role: 'user' }] })
    subscriptions = (await admin1.get('/api/subscriptions')).data.results
    expect(subscriptions.find(s => s._id === allRolesSubscription._id)).toBeTruthy()
    expect(subscriptions.find(s => s._id === adminSubscription._id)).toBeFalsy()
  })
})

const postEvents = async () => {
  await axPush.post('/api/events', [{
    date: new Date().toISOString(),
    topic: { key: 'topic1' },
    title: 'own feed event',
    sender: { type: 'user', id: 'test-user1', name: 'Zéphyrine Dubois' },
    originator: { user: { id: 'test-user1', name: 'Zéphyrine Dubois' } }
  }, {
    date: new Date().toISOString(),
    topic: { key: 'topic1' },
    title: 'organization feed event',
    sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
    originator: { user: { id: 'test-user1', name: 'Zéphyrine Dubois' }, organization: { id: 'test1', name: 'Test Organization 1' } }
  }])
}

test.describe('identities update webhook on events', () => {
  test.beforeEach(clean)

  test('should rename a department and forget the name of a deleted one', async () => {
    const subscription = (await admin1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1', department: 'dep1', departmentName: 'Department 1' },
      visibility: 'private'
    })).data
    await axPush.post('/api/events', [{
      date: new Date().toISOString(),
      topic: { key: 'topic1' },
      title: 'department feed event',
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1', department: 'dep1', departmentName: 'Department 1' }
    }])

    await axIdentities.post('/api/identities/organization/test1', { name: 'Test Organization 1', departments: [{ id: 'dep1', name: 'Renamed Department' }] })
    let fresh = (await admin1.get('/api/subscriptions')).data.results.find((s: Subscription) => s._id === subscription._id)
    expect(fresh.sender.departmentName).toBe('Renamed Department')
    let events = (await admin1.get('/api/events')).data.results
    expect(events[0].sender.departmentName).toBe('Renamed Department')

    // dep1 is missing from the complete list of departments: it was deleted, only its id remains
    await axIdentities.post('/api/identities/organization/test1', { name: 'Test Organization 1', departments: [] })
    fresh = (await admin1.get('/api/subscriptions')).data.results.find((s: Subscription) => s._id === subscription._id)
    expect(fresh.sender.department).toBe('dep1')
    expect(fresh.sender.departmentName).toBeUndefined()
    events = (await admin1.get('/api/events')).data.results
    expect(events[0].sender.department).toBe('dep1')
    expect(events[0].sender.departmentName).toBeUndefined()
  })

  test('should rename the sender and originator of events and let the search worker rebuild the search texts', async () => {
    await postEvents()
    await axIdentities.post('/api/identities/user/test-user1', { name: 'Aurélien Lefort' })

    const ownEvents = (await user1.get('/api/events')).data.results
    expect(ownEvents).toHaveLength(1)
    expect(ownEvents[0].sender.name).toBe('Aurélien Lefort')
    expect(ownEvents[0].originator.user.name).toBe('Aurélien Lefort')
    // the search texts are rebuilt by the search worker, after the webhook responded
    await expect.poll(async () => (await user1.get('/api/events?q=Lefort')).data.results.length, { timeout: 10000 }).toBe(1)
    expect((await user1.get('/api/events?q=Dubois')).data.results).toHaveLength(0)

    let orgEvents = (await admin1.get('/api/events')).data.results
    expect(orgEvents).toHaveLength(1)
    expect(orgEvents[0].originator.user.name).toBe('Aurélien Lefort')

    await axIdentities.post('/api/identities/organization/test1', { name: 'Renamed Organization 1' })
    orgEvents = (await admin1.get('/api/events')).data.results
    expect(orgEvents[0].sender.name).toBe('Renamed Organization 1')
    expect(orgEvents[0].originator.organization.name).toBe('Renamed Organization 1')
    await expect.poll(async () => (await admin1.get('/api/events?q=Renamed')).data.results.length, { timeout: 10000 }).toBe(1)
  })

  test('should end up with the last name when renames follow each other', async () => {
    await postEvents()
    await axIdentities.post('/api/identities/organization/test1', { name: 'Intermediate Name' })
    await axIdentities.post('/api/identities/organization/test1', { name: 'Final Name' })
    await expect.poll(async () => (await admin1.get('/api/events?q=Final')).data.results.length, { timeout: 10000 }).toBe(1)
    expect((await admin1.get('/api/events?q=Intermediate')).data.results).toHaveLength(0)
  })
})

test.describe('identities delete webhook', () => {
  test.beforeEach(clean)

  test('should delete the events of a deleted user and pseudonymize the ones it triggered elsewhere', async () => {
    await postEvents()
    expect((await admin1.get('/api/events?q=Dubois')).data.results).toHaveLength(1)
    await axIdentities.delete('/api/identities/user/test-user1')

    expect((await user1.get('/api/events')).data.results).toHaveLength(0)
    const orgEvents = (await admin1.get('/api/events')).data.results
    expect(orgEvents).toHaveLength(1)
    expect(orgEvents[0].originator.user).toEqual({ id: 'test-user1' })
    expect(orgEvents[0].originator.organization.name).toBe('Test Organization 1')
    // the name also leaves the search texts, once the search worker went through
    await expect.poll(async () => (await admin1.get('/api/events?q=Dubois')).data.results.length, { timeout: 10000 }).toBe(0)
    expect((await admin1.get('/api/events?q=test-user1')).data.results).toHaveLength(1)
  })

  test('should delete the events of a deleted organization', async () => {
    await postEvents()
    await axIdentities.delete('/api/identities/organization/test1')
    expect((await admin1.get('/api/events')).data.results).toHaveLength(0)
    expect((await user1.get('/api/events')).data.results).toHaveLength(1)
  })

  test('should delete subscriptions and notifications of a deleted user before responding', async () => {
    await user1.post('/api/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'test-user1', name: 'User1' },
      visibility: 'public'
    })
    await user1.post('/api/subscriptions', {
      topic: { key: 'topic2' },
      sender: { type: 'organization', id: 'test1', name: 'Test Organization 1' },
      visibility: 'public'
    })
    await axPush.post('/api/notifications', {
      topic: { key: 'topic1' },
      title: 'a notification',
      recipient: { id: 'test-user1' }
    })
    expect((await user1.get('/api/subscriptions')).data.results).toHaveLength(2)
    expect((await user1.get('/api/notifications')).data.count).toBe(1)

    await axIdentities.delete('/api/identities/user/test-user1')
    // the deletions must be complete when the webhook responds, no polling here
    expect((await user1.get('/api/subscriptions')).data.results).toHaveLength(0)
    expect((await user1.get('/api/notifications')).data.count).toBe(0)
  })
})
