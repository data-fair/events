import jsonSchema from '@data-fair/lib/json-schema.js'
import webhookSubscriptionSchema from '#types/webhook-subscription/schema.js'

export default {
  $id: 'https://github.com/data-fair/events/webhook-subscriptions/post-req',
  title: 'Post webhook-subscription req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(webhookSubscriptionSchema)
        .removeProperties(['created', 'updated'])
        .removeFromRequired(['_id', 'owner'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
