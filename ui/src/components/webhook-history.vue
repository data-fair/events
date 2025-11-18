<template>
  <v-list
    variant="flat"
    style="position:relative"
  >
    <v-row class="ma-0">
      <v-spacer />
      <v-btn
        v-if="webhooks"
        color="primary"
        variant="flat"
        :loading="test.loading.value"
        @click="test.execute()"
      >
        tester
        <v-icon
          end
          :icon="mdiSend"
        />
      </v-btn>
      <v-spacer />
      <v-btn
        icon
        variant="flat"
        color="primary"
        density="comfortable"
        @click="fetchWebhooks.refresh()"
      >
        <v-icon :icon="mdiRefresh" />
      </v-btn>
    </v-row>
    <div style="height:4px;width:100%;">
      <v-progress-linear
        v-if="fetchWebhooks.loading.value"
        stream
        height="4"
        style="margin:0;"
      />
    </div>
    <template v-if="webhooks && webhooks.length">
      <webhook-history-item
        v-for="webhook in webhooks"
        :key="webhook._id"
        :webhook="webhook"
        @refresh="fetchWebhooks.refresh()"
      />
    </template>
  </v-list>
</template>

<script lang="ts" setup>
import type { Webhook, WebhookSubscription } from '#api/types'

const { subscription } = defineProps<{ subscription: WebhookSubscription }>()

const webhooksParams = computed(() => ({ size: 100, subscription: subscription._id }))
const fetchWebhooks = useFetch<{ results: Webhook[] }>($apiPath + '/webhooks', { query: webhooksParams })
const webhooks = computed(() => fetchWebhooks.data.value?.results)

const test = useAsyncAction(async () => {
  await $fetch(`api/v1/webhook-subscriptions/${subscription._id}/_test`, { method: 'POST' })
  await fetchWebhooks.refresh()
})
</script>

<style>

</style>
