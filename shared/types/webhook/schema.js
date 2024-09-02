export default {
  $id: 'https://github.com/data-fair/events/webhook',
  title: 'Webhook',
  'x-exports': ['types', 'validate'],
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'subscription', 'sender', 'owner', 'notification', 'status', 'nbAttempts'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifiant'
    },
    // the sender is the owner of the topic
    sender: { $ref: 'https://github.com/data-fair/events/partial#/$defs/owner', title: 'Émetteur' },
    owner: { $ref: 'https://github.com/data-fair/events/partial#/$defs/owner' },
    subscription: {
      type: 'object',
      additionalProperties: false,
      required: ['_id', 'title'],
      properties: {
        _id: {
          type: 'string',
          title: 'Identifiant'
        },
        title: {
          type: 'string',
          title: 'Libellé de la souscription'
        }
      }
    },
    notification: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        topic: { $ref: 'https://github.com/data-fair/events/partial#/$defs/topicRef' },
        url: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        extra: { type: 'object' }
      }
    },
    status: {
      type: 'string',
      enum: ['waiting', 'working', 'ok', 'error', 'cancelled']
    },
    nbAttempts: { type: 'integer' },
    lastAttempt: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time' },
        status: { type: 'integer' },
        error: { type: 'string' }
      }
    },
    nextAttempt: {
      type: 'string',
      format: 'date-time'
    }
  }
}
