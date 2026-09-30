<template>
  <v-expansion-panels
    v-model="currentPanel"
    density="compact"
    variant="inset"
  >
    <div style="height:4px;width:100%;">
      <v-progress-linear
        v-if="fetchSubscriptions.loading.value"
        height="4"
        style="margin:0;"
      />
    </div>
    <template v-if="fetchSubscriptions.data.value">
      <v-expansion-panel
        v-for="subscription in fetchSubscriptions.data.value.results"
        :key="subscription._id"
      >
        <v-expansion-panel-title>
          <div>
            <div>{{ subscription.title }}</div>
            <div
              v-if="topics.length > 1"
              class="text-caption text-medium-emphasis"
            >
              {{ subscription.topic.title ?? subscription.topic.key }}
            </div>
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
      <v-expansion-panel v-if="!fetchSubscriptions.loading.value">
        <v-expansion-panel-title>{{ t('new') }}</v-expansion-panel-title>
        <v-expansion-panel-text>
          <webhook-subscription-form
            :model-value="newSubscription"
            :topics="topics"
            @saved="fetchSubscriptions.refresh()"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </template>
  </v-expansion-panels>
</template>

<i18n lang="yaml">
fr:
  new: Déclarer un nouveau Webhook
en:
  new: Declare a new webhook
</i18n>

<script lang="ts" setup>
import type { Event, WebhookSubscription } from '#api/types'

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

const onDeleted = async () => {
  await fetchSubscriptions.refresh()
  currentPanel.value = null
}

</script>

<style lang="css" scoped>
</style>
