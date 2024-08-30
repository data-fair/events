export default {
  $id: 'https://github.com/data-fair/events/notification',
  'x-exports': ['types', 'validate'],
  title: 'Notification',
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'title', 'topic', 'sender', 'recipient', 'date'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifiant',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Titre'
    },
    body: {
      type: 'string',
      title: 'Contenu'
    },
    htmlBody: {
      type: 'string',
      title: 'Contenu HTML'
    },
    locale: {
      type: 'string',
      title: 'Langue de la notification',
      enum: ['fr', 'en']
    },
    icon: {
      type: 'string',
      title: 'URL de l\'icone de la notification'
    },
    // sender is the owner of the topic
    sender: { $ref: 'https://github.com/data-fair/events/partial#/$defs/owner', title: 'Émetteur' },
    topic: { $ref: 'https://github.com/data-fair/events/partial#/$defs/topicRef' },
    // the recipient of the matched subscription
    recipient: { $ref: 'https://github.com/data-fair/events/partial#/$defs/recipient' },
    outputs: {
      type: 'array',
      title: 'Sorties',
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
    url: {
      type: 'string',
      title: 'calculé à partir de subscription.urlTemplate et event.urlParams',
      readOnly: true
    },
    date: {
      readOnly: true,
      type: 'string',
      description: 'reception date',
      format: 'date-time'
    },
    new: {
      readOnly: true,
      type: 'boolean'
    },
    extra: {
      type: 'object',
      description: 'propriétés libres qui varient en fonction du type de notification'
    }
  }
}
