import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import EventSchema from '@data-fair/lib-common-types/event/schema.js'

export default {
  $id: 'https://github.com/data-fair/events/events/post-single-req',
  title: 'Post single event req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body: jsonSchema(EventSchema)
      .removeReadonlyProperties()
      .removeFromRequired(['date'])
      .removeId()
      .appendTitle(' post')
      .schema
  },
  $defs: EventSchema.$defs
}
