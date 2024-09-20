import type { PostEventReq } from '../../api/doc/events/post-req/index.js'
import { axiosBuilder } from '@data-fair/lib/node/axios.js'

const ax = axiosBuilder({ params: { key: 'SECRET_EVENTS' }, baseURL: 'http://localhost:8082' })

const postEvent = async (event: PostEventReq['body']) => {
  await ax.post('/events/api/v1/events', event)
}

await postEvent({
  title: 'A notification ' + new Date().toISOString(),
  sender: { type: 'organization', id: 'orga1' },
  topic: { key: 'topic1', title: 'Topic 1' }
})

process.exit()
