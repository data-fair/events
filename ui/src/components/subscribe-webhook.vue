<template>
  <v-progress-linear
    v-if="!fetchSubscriptions.data.value"
    indeterminate
    color="primary"
  />
  <template v-else>
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <span class="text-title-medium">{{ t('webhooks', { count: subscriptions.length }, subscriptions.length) }}</span>
      <v-spacer />
      <v-btn
        v-if="!creating"
        :prepend-icon="mdiPlus"
        color="primary"
        variant="flat"
        size="small"
        @click="creating = true"
      >
        {{ t('new') }}
      </v-btn>
    </div>
    <!-- inline, not in a menu: an overlay is not counted in the height of the iframe and would be cut -->
    <v-expand-transition>
      <v-card
        v-if="creating"
        :title="t('new')"
        class="mb-4"
      >
        <template #append>
          <v-btn
            :icon="mdiClose"
            :title="t('cancel')"
            :aria-label="t('cancel')"
            variant="text"
            size="small"
            @click="creating = false"
          />
        </template>
        <v-card-text>
          <webhook-subscription-form
            :model-value="newSubscription"
            :topics="topics"
            @saved="onCreated"
          />
        </v-card-text>
      </v-card>
    </v-expand-transition>
    <p
      v-if="!subscriptions.length && !creating"
      class="text-body-medium text-medium-emphasis"
    >
      {{ t('noWebhooks') }}
    </p>
    <v-expansion-panels
      v-else-if="subscriptions.length"
      v-model="currentPanel"
      variant="accordion"
      class="border-sm rounded"
      flat
    >
      <v-expansion-panel
        v-for="subscription in subscriptions"
        :key="subscription._id"
      >
        <v-expansion-panel-title>
          <div class="d-flex flex-column ga-1">
            <span>{{ subscription.title }}</span>
            <span class="text-body-small text-medium-emphasis text-break">
              {{ subscription.url }}<template v-if="topics.length > 1"> · {{ subscription.topic.title ?? subscription.topic.key }}</template>
            </span>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <webhook-subscription-form
            :model-value="subscription"
            :topics="topics"
            @saved="fetchSubscriptions.refresh()"
            @deleted="onDeleted"
          />
          <webhook-history :subscription="subscription" />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </template>
</template>

<i18n lang="yaml">
fr:
  webhooks: "Aucun webhook | 1 webhook | {count} webhooks"
  new: Ajouter un webhook
  cancel: Annuler
  noWebhooks: Aucun webhook n'est déclaré pour ces évènements.
en:
  webhooks: "No webhook | 1 webhook | {count} webhooks"
  new: Add a webhook
  cancel: Cancel
  noWebhooks: No webhook is declared for these events.
</i18n>

<script lang="ts" setup>
import type { Event, WebhookSubscription } from '#api/types'
import { mdiClose, mdiPlus } from '@mdi/js'

const {
  topics,
  sender,
  noSender
} = defineProps<{
  topics: { key: string, title: string }[]
  sender?: Event['sender']
  noSender: boolean
}>()

const { t } = useI18n()
const session = useSessionAuthenticated()

const currentPanel = ref<number | null>(null)
const creating = ref(false)

// a stable object: an inline literal would be recreated on every render and reset the form
const newSubscription = computed(() => ({
  topic: topics.length === 1 ? topics[0] : undefined,
  sender: sender ?? session.state.account
}))

const subscriptionsParams = computed(() => ({
  recipient: session.state.user.id,
  topic: topics.map(topic => topic.key).join(','),
  size: 100,
  sender: noSender ? 'none' : serializeSender(sender ?? session.state.account)
}))
const fetchSubscriptions = useFetch<{ results: WebhookSubscription[] }>($apiPath + '/webhook-subscriptions', { query: subscriptionsParams })
const subscriptions = computed(() => fetchSubscriptions.data.value?.results ?? [])

// open the new webhook: its history and its test button are what comes next
const onCreated = async () => {
  const previousIds = subscriptions.value.map(s => s._id)
  creating.value = false
  await fetchSubscriptions.refresh()
  const index = subscriptions.value.findIndex(s => !previousIds.includes(s._id))
  if (index !== -1) currentPanel.value = index
}

const onDeleted = async () => {
  await fetchSubscriptions.refresh()
  currentPanel.value = null
}
</script>
