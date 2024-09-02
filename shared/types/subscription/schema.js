export default {
  $id: 'https://github.com/data-fair/events/subscription',
  'x-exports': ['types', 'validate'],
  title: 'Subscription',
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'sender', 'topic', 'recipient', 'outputs', 'created', 'updated'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifiant',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Libellé de la souscription'
    },
    locale: {
      type: 'string',
      title: 'Langue de la souscription',
      default: 'fr',
      enum: ['fr', 'en']
    },
    // sender is the owner of the topic
    sender: { $ref: 'https://github.com/data-fair/events/partial#/$defs/owner', title: 'Émetteur' },
    topic: { $ref: 'https://github.com/data-fair/events/partial#/$defs/topicRef' },
    // the recipient of the matched subscription
    recipient: { $ref: 'https://github.com/data-fair/events/partial#/$defs/recipient' },
    outputs: {
      type: 'array',
      title: 'Sorties',
      default: ['devices'],
      items: {
        type: 'string',
        oneOf: [{
          const: 'devices',
          title: 'recevoir la notification sur vos appareils configurés'
        }, {
          const: 'email',
          title: 'recevoir la notification par email'
        }]
      }
    },
    urlTemplate: {
      type: 'string',
      title: 'Template de lien'
    },
    visibility: {
      type: 'string',
      title: 'Visibilité des notifications à recevoir',
      enum: ['public', 'private'],
      default: 'private'
    },
    icon: {
      type: 'string',
      title: 'Icone'
    },
    created: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' },
    updated: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' }
  }
}
