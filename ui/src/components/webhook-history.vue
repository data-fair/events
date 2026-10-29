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
        @refresh="fetchWebhooks.refresh()"
      />
      <v-list-item
        v-if="!webhooks.length"
        :subtitle="t('noWebhooks')"
      />
      <v-btn
        v-if="webhooks.length < count"
        :loading="fetchMore.loading.value"
        variant="text"
        color="primary"
        block
        @click="fetchMore.execute()"
      >
        {{ t('seeMore') }}
      </v-btn>
    </template>
  </v-list>
</template>

<i18n lang="yaml">
fr:
  history: Historique des appels
  noWebhooks: Ce webhook n'a pas encore été appelé.
  seeMore: Voir plus
en:
  history: Call history
  noWebhooks: This webhook has not been called yet.
  seeMore: See more
</i18n>

<script lang="ts" setup>
import type { Webhook, WebhookSubscription } from '#api/types'

const { subscription } = defineProps<{ subscription: WebhookSubscription }>()

const { t } = useI18n()

// the last calls first, the older ones on demand: a busy webhook can have thousands
const size = 10
const webhooksParams = computed(() => ({ size, subscription: subscription._id }))
const fetchWebhooks = useFetch<{ results: Webhook[], count: number }>($apiPath + '/webhooks', { query: webhooksParams })
// a local copy, the fetched data is read-only and the WS messages patch it
const webhooks = ref<Webhook[]>()
const count = ref(0)
watch(fetchWebhooks.data, (data) => {
  webhooks.value = data?.results
  count.value = data?.count ?? 0
}, { immediate: true })

const fetchMore = useAsyncAction(async () => {
  if (!webhooks.value) return
  const res = await $fetch<{ results: Webhook[] }>('webhooks', { query: { ...webhooksParams.value, skip: webhooks.value.length } })
  // the calls received live shifted the pages: skip the ones already listed
  const known = new Set(webhooks.value.map(w => w._id))
  webhooks.value = webhooks.value.concat(res.results.filter(w => !known.has(w._id)))
})

// the delivery progress is pushed live, see webhooksChannel in the API
const ws = useWS($apiPath + '/')
ws?.subscribe<Webhook>(`${subscription.owner.type}:${subscription.owner.id}:webhook-subscriptions/${subscription._id}/webhooks`, (webhook) => {
  const results = webhooks.value
  if (!results) return
  const i = results.findIndex(w => w._id === webhook._id)
  if (i === -1) {
    results.unshift(webhook)
    count.value += 1
  } else results[i] = webhook
})
// messages sent while the socket was reconnecting are lost, catch up from the API
watch(() => ws?.opened.value, (opened, wasOpened) => {
  if (opened && wasOpened === false) fetchWebhooks.refresh()
})

</script>

<style>

</style>
