import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import EventSchema from '#types/event/schema.js'

export default {
  $id: 'https://github.com/data-fair/events/events/post-req',
  title: 'Post event req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(EventSchema)
        .removeReadonlyProperties()
        .removeFromRequired(['visibility'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
