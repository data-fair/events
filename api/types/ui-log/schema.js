export default {
  $id: 'https://github.com/data-fair/events/ui-log',
  title: 'UI log',
  'x-exports': ['types', 'validate'],
  type: 'object',
  additionalProperties: false,
  required: ['message'],
  properties: {
    message: {
      type: 'string',
      maxlength: 1000
    }
  }
}
