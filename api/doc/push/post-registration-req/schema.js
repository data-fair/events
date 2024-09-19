import jsonSchema from '@data-fair/lib/json-schema.js'
import DeviceRegistration from '#types/device-registration/schema.js'

export default {
  $id: 'https://github.com/data-fair/events/push-subscriptions/post-registration-req',
  title: 'Post registration req',
  'x-exports': ['validate', 'types'],
  type: 'object',
  required: ['body'],
  properties: {
    body:
      jsonSchema(DeviceRegistration)
        .removeReadonlyProperties()
        .removeFromRequired(['type', 'deviceName'])
        .removeId()
        .appendTitle(' post')
        .schema
  }
}
