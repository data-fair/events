export default {
  $id: 'https://github.com/data-fair/events/push-subscription',
  'x-exports': ['types', 'validate'],
  title: 'Devices push subscription',
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'recipient', 'registrations'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifiant',
      readOnly: true
    },
    owner: { $ref: 'https://github.com/data-fair/events/partial#/$defs/owner' },
    registrations: {
      type: 'array',
      items: {
        $ref: 'https://github.com/data-fair/events/device-registration'
      }
    }
  }
}
