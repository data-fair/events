import { strict as assert } from 'node:assert'
import { it, describe, before, beforeEach, after } from 'node:test'
import { axios, axiosAuth, clean, startApiServer, stopApiServer } from './utils/index.ts'

const axAno = axios()
const axPush = axios({ params: { key: 'SECRET_EVENTS' } })
const user1 = await axiosAuth('user1@test.com')
const admin1 = await axiosAuth('admin1@test.com')

describe('events', () => {
  before(startApiServer)
  beforeEach(clean)
  after(stopApiServer)

  it('should reject wrong secret  key', async () => {
    await assert.rejects(axAno.post('/api/v1/events', {}, { params: { key: 'badkey' } }), { status: 401 })
  })

  it('should reject anonymous user', async () => {
    await assert.rejects(axAno.get('/api/v1/events'), { status: 401 })
  })

  it('should send a notification straight to a user', async () => {
    let res = await axPush.post('/api/v1/events', {
      topic: { key: 'topic1' },
      title: 'a notification',
      sender: { type: 'user', id: 'user1' }
    })
    assert.ok(res.data.date)
    res = await admin1.get('/api/v1/events')
    assert.equal(res.data.results.length, 0)
    res = await user1.get('/api/v1/events')
    assert.equal(res.data.results.length, 1)
  })
})
