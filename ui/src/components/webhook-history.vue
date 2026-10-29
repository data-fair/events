<template>
  <v-list
    variant="flat"
    density="compact"
    class="mt-4"
  >
    <div class="text-body-large">
      {{ t('history') }}<template v-if="count">
        ({{ count }})
      </template>
    </div>
    <template v-if="webhooks">
      <webhook-history-item
        v-for="webhook in webhooks"
        :key="webhook._id"
        :webhook="webhook"
        @refresh="refresh.execute()"
      />
      <v-list-item
        v-if="!webhooks.length"
        :subtitle="t('noWebhooks')"
      />
      <load-more-btn
        v-if="webhooks.length < count"
        :loading="more.loading.value"
        @click="more.execute()"
      />
    </template>
  </v-list>
</template>

<i18n lang="yaml">
fr:
  history: Historique des appels
  noWebhooks: Ce webhook n'a pas encore été appelé.
en:
  history: Call history
  noWebhooks: This webhook has not been called yet.
</i18n>

<script lang="ts" setup>
import type { Webhook, WebhookSubscription } from '#api/types'

const { subscription } = defineProps<{ subscription: WebhookSubscription }>()

const { t } = useI18n()

// the last calls first, the older ones on demand: a busy webhook can have thousands
const { items: webhooks, count, refresh, more } = useLoadMore<Webhook>('webhooks', () => ({ subscription: subscription._id }), 10)

// the delivery progress is pushed live, see webhooksChannel in the API
const ws = useWS($apiPath + '/')
ws?.subscribe<Webhook>(`${subscription.owner.type}:${subscription.owner.id}:webhook-subscriptions/${subscription._id}/webhooks`, (webhook) => {
  const results = webhooks.value
  if (!results) return
  const i = results.findIndex(w => w._id === webhook._id)
  if (i !== -1) results[i] = webhook
  // a new call: not the progress of an older one, retried while it is not listed
  else if (!results.length || (webhook.notification.date ?? '') >= (results[0].notification.date ?? '')) {
    results.unshift(webhook)
    count.value += 1
  }
})
// messages sent while the socket was reconnecting are lost, catch up from the API
watch(() => ws?.opened.value, (opened, wasOpened) => {
  if (opened && wasOpened === false) refresh.execute()
})

</script>

<style>

</style>
