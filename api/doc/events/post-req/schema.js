import PostSingleReqSchema from '../post-single-req/schema.js'

export default {
  $id: 'https://github.com/data-fair/events/events/post-req',
  title: 'Post event req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body: {
      type: 'array',
      items: PostSingleReqSchema.properties.body
    }
  },
  $defs: PostSingleReqSchema.$defs
}
