<template>
  <v-list
    variant="flat"
    density="compact"
    class="mt-4"
  >
    <div class="d-flex align-center ga-2">
      <span class="text-subtitle-1">{{ t('history') }}</span>
      <v-btn
        icon
        variant="text"
        color="primary"
        density="comfortable"
        :title="t('refresh')"
        :aria-label="t('refresh')"
        :loading="fetchWebhooks.loading.value"
        @click="fetchWebhooks.refresh()"
      >
        <v-icon :icon="mdiRefresh" />
      </v-btn>
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
  refresh: Rafraîchir l'historique
  test: Tester
  noWebhooks: Ce webhook n'a pas encore été appelé.
en:
  history: Call history
  refresh: Refresh the history
  test: Test
  noWebhooks: This webhook has not been called yet.
</i18n>

<script lang="ts" setup>
import type { Webhook, WebhookSubscription } from '#api/types'

const { subscription } = defineProps<{ subscription: WebhookSubscription }>()

const { t } = useI18n()

const webhooksParams = computed(() => ({ size: 100, subscription: subscription._id }))
const fetchWebhooks = useFetch<{ results: Webhook[] }>($apiPath + '/webhooks', { query: webhooksParams })
const webhooks = computed(() => fetchWebhooks.data.value?.results)

const test = useAsyncAction(async () => {
  await $fetch(`webhook-subscriptions/${subscription._id}/_test`, { method: 'POST' })
  await fetchWebhooks.refresh()
})
</script>

<style>

</style>
