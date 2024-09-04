import jsonSchema from '@data-fair/lib/json-schema.js'
import SubscriptionSchema from '../../../../shared/types/subscription/schema.js'

export default {
  $id: 'https://github.com/data-fair/events/subscriptions/post-req',
  title: 'Post subscription req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(SubscriptionSchema)
        .removeProperties(['created', 'updated'])
        .removeFromRequired(['_id', 'visibility', 'outputs', 'recipient'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
