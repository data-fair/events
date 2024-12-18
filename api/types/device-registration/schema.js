export default {
  $id: 'https://github.com/data-fair/events/device-registration',
  'x-exports': ['types', 'validate'],
  title: 'Device registration',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'deviceName', 'date'],
  properties: {
    id: {
      title: 'Identifiant',
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          required: ['endpoint', 'keys'],
          properties: {
            endpoint: { type: 'string' },
            /* keys: {
              type: 'object',
              required: ['p256dh', 'auth'],
              properties: {
                p256dh: { type: 'string' },
                auth: { type: 'string' }
              }
            } */
          }
        }
      ]
    },
    type: {
      type: 'string',
      enum: ['webpush']
    },
    deviceName: {
      type: 'string'
    },
    date: {
      type: 'string',
      format: 'date-time',
      readOnly: true
    },
    lastSuccess: {
      type: 'string',
      format: 'date-time',
      readOnly: true
    },
    disabledUntil: {
      type: 'string',
      format: 'date-time',
      readOnly: true
    },
    disabled: {
      type: 'string',
      enum: ['gone', 'errors'],
      readOnly: true
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
      },
      readOnly: true
    }
  }
}
