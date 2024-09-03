import { Counter } from 'prom-client'

export const sentNotifications = new Counter({
  name: 'df_notify_sent_notifications_total',
  help: 'Number of notifications sent to outgoing channels',
  labelNames: ['output']
})
