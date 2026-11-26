import type { PostEventReq } from '../../api/doc/events/post-req/index.js'
import 'dotenv/config'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'

// usage: npm run dev-send-notifications -- <organization id> [<user id>]
// the organization sends the notification (its topic1 subscribers receive it), the user is shown as its originator
const [orgId, userId] = process.argv.slice(2)
if (!orgId) {
  console.error('usage: npm run dev-send-notifications -- <organization id> [<user id>]')
  process.exit(1)
}

const ax = axiosBuilder({ headers: { 'x-secret-key': 'secret-events' }, baseURL: `http://localhost:${process.env.DEV_API_PORT}` })

const postEvent = async (events: PostEventReq['body']) => {
  await ax.post('/api/events', events)
}

await postEvent([{
  title: 'A notification ' + new Date().toISOString(),
  sender: { type: 'organization', id: orgId },
  topic: { key: 'topic1', title: 'Topic 1' },
  date: new Date().toISOString(),
  resource: { type: 'dataset', id: 'dataset1', title: 'Dataset 1' },
  originator: {
    ...(userId ? { user: { id: userId } } : {}),
    organization: { id: orgId }
  }
}])

process.exit()
