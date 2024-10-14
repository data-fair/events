export default {
  $id: 'https://github.com/data-fair/events/push-subscriptions/put-registration-req',
  title: 'Post event req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body: {
      type: 'array',
      items: {
        $ref: 'https://github.com/data-fair/events/device-registration'
      }
    }
  }
}
