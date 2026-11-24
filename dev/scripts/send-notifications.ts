import type { PostEventReq } from '../../api/doc/events/post-req/index.js'
import 'dotenv/config'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'

const ax = axiosBuilder({ headers: { 'x-secret-key': 'secret-events' }, baseURL: `http://localhost:${process.env.DEV_API_PORT}` })

const postEvent = async (events: PostEventReq['body']) => {
  await ax.post('/api/events', events)
}

await postEvent([{
  title: 'A notification ' + new Date().toISOString(),
  sender: { type: 'organization', id: 'test_demo_org' },
  topic: { key: 'topic1', title: 'Topic 1' },
  date: new Date().toISOString(),
  resource: { type: 'dataset', id: 'dataset1', title: 'Dataset 1' },
  originator: {
    user: { id: 'test_demo_dev', name: 'Dev User' },
    organization: { id: 'test_demo_org', name: 'Fixtures Demo' }
  }
}])

process.exit()
