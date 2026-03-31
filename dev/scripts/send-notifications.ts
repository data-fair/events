import type { PostEventReq } from '../../api/doc/events/post-req/index.js'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'

const ax = axiosBuilder({ params: { key: 'SECRET_EVENTS' }, baseURL: 'http://localhost:8082' })

const postEvent = async (events: PostEventReq['body']) => {
  await ax.post('/events/api/events', events)
}

await postEvent([{
  title: 'A notification ' + new Date().toISOString(),
  sender: { type: 'organization', id: 'dev1' },
  topic: { key: 'topic1', title: 'Topic 1' },
  date: new Date().toISOString(),
  resource: { type: 'dataset', id: 'dataset1', title: 'Dataset 1' },
  originator: {
    user: { id: 'dev-user1', name: 'Dev User 1' },
    organization: { id: 'dev1', name: 'Dev Organization' }
  }
}])

process.exit()
