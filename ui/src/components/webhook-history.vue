<template>
  <v-list
    variant="flat"
    density="compact"
    class="mt-4"
  >
    <div class="d-flex align-center ga-2">
      <span class="text-subtitle-1">{{ t('history') }}</span>
      <v-spacer />
      <v-btn
        color="primary"
        variant="flat"
        :loading="test.loading.value"
        @click="test.execute()"
      >
        {{ t('test') }}
        <v-icon
          end
          :icon="mdiSend"
        />
      </v-btn>
    </div>
    <template v-if="webhooks">
      <webhook-history-item
        v-for="webhook in webhooks"
        :key="webhook._id"
        :webhook="webhook"
        @refresh="fetchWebhooks.refresh()"
      />
      <v-list-item
        v-if="!webhooks.length"
        :subtitle="t('noWebhooks')"
      />
    </template>
  </v-list>
</template>

<i18n lang="yaml">
fr:
  history: Historique des appels
  test: Tester
  noWebhooks: Ce webhook n'a pas encore été appelé.
en:
  history: Call history
  test: Test
  noWebhooks: This webhook has not been called yet.
</i18n>

<script lang="ts" setup>
import type { Webhook, WebhookSubscription } from '#api/types'

const { subscription } = defineProps<{ subscription: WebhookSubscription }>()

const { t } = useI18n()

const webhooksParams = computed(() => ({ size: 100, subscription: subscription._id }))
const fetchWebhooks = useFetch<{ results: Webhook[] }>($apiPath + '/webhooks', { query: webhooksParams })
// a local copy, the fetched data is read-only and the WS messages patch it
const webhooks = ref<Webhook[]>()
watch(fetchWebhooks.data, (data) => { webhooks.value = data?.results }, { immediate: true })

// the delivery progress is pushed live, see webhooksChannel in the API
const ws = useWS($apiPath + '/')
ws?.subscribe<Webhook>(`${subscription.owner.type}:${subscription.owner.id}:webhook-subscriptions/${subscription._id}/webhooks`, (webhook) => {
  const results = webhooks.value
  if (!results) return
  const i = results.findIndex(w => w._id === webhook._id)
  if (i === -1) results.unshift(webhook)
  else results[i] = webhook
})
// messages sent while the socket was reconnecting are lost, catch up from the API
watch(() => ws?.opened.value, (opened, wasOpened) => {
  if (opened && wasOpened === false) fetchWebhooks.refresh()
})

const test = useAsyncAction(async () => {
  await $fetch(`webhook-subscriptions/${subscription._id}/_test`, { method: 'POST' })
  await fetchWebhooks.refresh()
})
</script>

<style>

</style>
