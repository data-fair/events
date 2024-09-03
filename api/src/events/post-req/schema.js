import jsonSchema from '@data-fair/lib/json-schema.js'
import EventSchema from '../../../../shared/types/event/schema.js'

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
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
