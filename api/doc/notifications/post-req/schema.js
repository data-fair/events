import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import NotificationSchema from '#types/notification/schema.js'

export default {
  $id: 'https://github.com/data-fair/events/notifications/post-req',
  title: 'Post notification req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(NotificationSchema)
        .removeReadonlyProperties()
        .removeFromRequired(['visibility'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
