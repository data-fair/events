import { Counter } from 'prom-client'

export const pushDeviceErrors = new Counter({
  name: 'df_events_push_device_errors_total',
  help: 'Number of errors while pushing notifications to devices',
  labelNames: ['output', 'statusCode']
})
