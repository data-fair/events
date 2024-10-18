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
      title: 'Identifiant',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Libellé de la souscription'
    },
    // the sender is the owner of the topic
    sender: { $ref: 'https://github.com/data-fair/events/partial#/$defs/senderSubscribe' },
    owner: { $ref: 'https://github.com/data-fair/lib/session-state#/$defs/account' },
    topic: { $ref: 'https://github.com/data-fair/lib/event#/$defs/topicRef' },
    url: { title: 'URL du webhook', type: 'string' },
    header: {
      title: 'Header HTTP de sécurisation du webhook',
      type: 'object',
      properties: {
        key: { type: 'string', title: 'Clé', 'x-cols': 6 },
        value: { type: 'string', title: 'Valeur', 'x-cols': 6 } // TODO: encrypt this value
      }
    },
    visibility: {
      type: 'string',
      title: 'Visibilité des notifications à recevoir',
      enum: ['public', 'private'],
      default: 'private',
      readOnly: true
    },
    created: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' },
    updated: { $ref: 'https://github.com/data-fair/events/partial#/$defs/modifier' }
  }
}
