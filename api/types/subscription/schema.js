export default {
  $id: 'https://github.com/data-fair/events/subscription',
  'x-exports': ['types', 'validate'],
  title: 'Subscription',
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'origin', 'topic', 'recipient', 'outputs', 'visibility', 'created', 'updated'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifier',
      readOnly: true
    },
    origin: {
      type: 'string',
      title: 'Origin site of the subscription',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Subscription label'
    },
    locale: {
      type: 'string',
      title: 'Subscription language',
      description: 'Language code of the notifications (fr, en…). Without it the stored language is kept on an update, else the session language of the request is used. Texts missing in this language fall back on the default language of the service.',
      pattern: '^[a-z]{2}$'
    },
    // sender is the owner of the topic
    sender: { $ref: 'https://github.com/data-fair/events/partial#/$defs/senderSubscribe' },
    topic: { $ref: 'https://github.com/data-fair/lib/event#/$defs/topicRef' },
    // the recipient of the matched subscription
    recipient: { $ref: 'https://github.com/data-fair/events/partial#/$defs/recipient' },
    outputs: {
      type: 'array',
      title: 'Outputs',
      default: ['devices'],
      items: {
        type: 'string',
        oneOf: [{
          const: 'devices',
          title: 'Receive the notification on your configured devices'
        }, {
          const: 'email',
          title: 'Receive the notification by email'
        }]
      }
    },
    urlTemplate: {
      type: 'string',
      title: 'Link template'
    },
    visibility: {
      type: 'string',
      title: 'Visibility of the notifications to receive',
      enum: ['public', 'private'],
      default: 'private'
    },
    icon: {
      type: 'string',
      title: 'Icon'
    },
    created: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' },
    updated: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' }
  }
}
