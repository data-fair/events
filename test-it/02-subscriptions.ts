import { strict as assert } from 'node:assert'
import { it, describe, before, beforeEach, after } from 'node:test'
import { axios, axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'

const axPush = axios({ params: { key: 'SECRET_EVENTS' } })
const user1 = await axiosAuth('user1@test.com')
const user2 = await axiosAuth('user2@test.com')
const admin1 = await axiosAuth('admin1@test.com')

describe('subscriptions', () => {
  before(startApiServer)
  beforeEach(clean)
  after(stopApiServer)

  it('should reject wrong recipient', async () => {
    await assert.rejects(user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      recipient: { id: 'anotheruser' },
      sender: { type: 'user', id: 'user1' }
    }), { status: 403 })
  })

  it('should send a public notification to any subscribed user', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    }
    await admin1.post('/api/v1/subscriptions', subscription)
    await user1.post('/api/v1/subscriptions', subscription)
    await user2.post('/api/v1/subscriptions', subscription)
    let res = await admin1.get('/api/v1/subscriptions')
    assert.equal(res.data.count, 1)

    res = await axPush.post('/api/v1/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'user', id: 'user1' },
      visibility: 'public'
    })
    res = await admin1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
  })

  it('should send a private notification only to member of sender organization', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1' }
    }
    let res = await admin1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'private')
    res = await user1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'private')
    res = await user2.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'public')

    res = await axPush.post('/api/v1/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga1' }
    })
    res = await admin1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })

  it('should send a private notification only to member of sender organization with certain role', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga1', role: 'admin' }
    }
    let res = await admin1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'private')
    res = await user1.post('/api/v1/subscriptions', subscription)
    assert.equal(res.data.visibility, 'public')

    res = await axPush.post('/api/v1/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga1', role: 'admin' }
    })
    res = await admin1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })

  it('should not send a global private notification to member of a department in sender organization', async () => {
    const subscription = {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2' }
    }
    let res = await user2.post('/api/v1/subscriptions', subscription)
    // user2 is in a department, he only as access to public notification on the root of the org
    assert.equal(res.data.visibility, 'public')

    res = await axPush.post('/api/v1/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2' }
    })
    res = await user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })

  it('should send a notification to any department', async () => {
    let res = await user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep1' }
    })
    assert.equal(res.data.visibility, 'private')
    res = await user2.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    assert.equal(res.data.visibility, 'private')

    res = await axPush.post('/api/v1/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2', department: '*' }
    })

    res = await user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
  })

  it('should send a private department notification to member of right department in sender organization', async () => {
    let res = await user1.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    assert.equal(res.data.visibility, 'public')
    res = await user2.post('/api/v1/subscriptions', {
      topic: { key: 'topic1' },
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    assert.equal(res.data.visibility, 'private')

    res = await axPush.post('/api/v1/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'organization', id: 'orga2', department: 'dep2' }
    })
    res = await user2.get('/api/v1/notifications')
    assert.equal(res.data.count, 1)
    res = await user1.get('/api/v1/notifications')
    assert.equal(res.data.count, 0)
  })
})