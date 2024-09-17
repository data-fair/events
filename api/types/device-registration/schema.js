export default {
  $id: 'https://github.com/data-fair/events/device-registration',
  'x-exports': ['types', 'validate'],
  title: 'Device registration',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'deviceName'],
  properties: {
    id: {
      type: 'string',
      title: 'Identifiant'
    },
    type: {
      type: 'string',
      enum: ['webpush']
    },
    deviceName: {
      type: 'string'
    },
    lastSuccess: {
      type: 'string',
      format: 'date-time'
    },
    disabledUntil: {
      type: 'string',
      format: 'date-time'
    },
    disabled: {
      type: 'string',
      enum: ['gone', 'errors']
    },
    lastErrors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'integer'
          }
        }
      }
    }
  }
}
