export default {
  $id: 'https://github.com/data-fair/events/events/post-single-req',
  title: 'Post single event req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body: { $ref: 'https://github.com/data-fair/lib/event' }
  }
}
