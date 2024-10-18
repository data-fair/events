export default {
  $id: 'https://github.com/data-fair/events/events/post-req',
  title: 'Post event req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body: {
      type: 'array',
      items: {
        $ref: 'https://github.com/data-fair/lib/event'
      }
    }
  }
}
