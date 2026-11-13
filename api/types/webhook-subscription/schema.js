export default {
  $id: 'https://github.com/data-fair/events/webhook-subscription',
  'x-exports': ['types', 'validate'],
  title: 'Webhook subscription',
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'topic', 'owner', 'url', 'sender', 'title'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifier',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Subscription label'
    },
    // the sender is the owner of the topic
    sender: { $ref: 'https://github.com/data-fair/events/partial#/$defs/senderSubscribe' },
    owner: { $ref: 'https://github.com/data-fair/lib/session-state#/$defs/account' },
    topic: { $ref: 'https://github.com/data-fair/lib/event#/$defs/topicRef' },
    url: { title: 'Webhook URL', type: 'string' },
    header: {
      title: 'Webhook security HTTP header',
      type: 'object',
      properties: {
        key: { type: 'string', title: 'Key', 'x-cols': 6 },
        value: { type: 'string', title: 'Value', 'x-cols': 6 } // TODO: encrypt this value
      }
    },
    visibility: {
      type: 'string',
      title: 'Visibility of the notifications to receive',
      enum: ['public', 'private'],
      default: 'private',
      readOnly: true
    },
    created: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' },
    updated: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' }
  }
}
