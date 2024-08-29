/**
 * @param {string} title
 */
const i18nMsg = (title) => ({
  type: 'object',
  title: `${title} internationalisé`,
  properties: ['fr', 'en'].reduce((/** @type {Record<string, any>} */props, locale) => { props[locale] = { type: 'string', title: locale }; return props }, {})
})

export default {
  $id: 'https://github.com/data-fair/events/event',
  'x-exports': ['types', 'validate'],
  type: 'object',
  additionalProperties: false,
  required: ['_id', 'title', 'topic', 'sender', 'date'],
  properties: {
    _id: {
      type: 'string',
      title: 'Identifiant',
      readOnly: true
    },
    title: {
      oneOf: [{
        type: 'string',
        title: 'Titre'
      }, i18nMsg('Titre')]
    },
    body: {
      oneOf: [{
        type: 'string',
        title: 'Contenu'
      }, i18nMsg('Contenu')]
    },
    htmlBody: {
      oneOf: [{
        type: 'string',
        title: 'Contenu HTML'
      }, i18nMsg('Contenu HTML')]
    },
    icon: {
      type: 'string',
      title: 'URL de l\'icone de l\'évènement'
    },
    // sender is the owner of the topic
    sender: { $ref: 'https://github.com/data-fair/events/partial#/$defs/owner', title: 'Émetteur' },
    topic: { $ref: 'https://github.com/data-fair/events/partial#/$defs/topicRef' },
    urlParams: {
      type: 'object',
      title: 'utilisé pour renseigner subscription.urlTemplate et ainsi créer notification.url',
      patternProperties: {
        '.*': { type: 'string' }
      }
    },
    visibility: {
      type: 'string',
      title: 'Visibilité',
      enum: ['public', 'private'],
      default: 'private'
    },
    date: {
      readOnly: true,
      type: 'string',
      description: 'reception date',
      format: 'date-time'
    },
    extra: {
      type: 'object',
      description: 'propriétés libres qui varient en fonction du type d\'évènement'
    }
  }
}
