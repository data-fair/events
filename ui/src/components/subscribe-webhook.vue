<template>
  <v-expansion-panels
    v-model="currentPanel"
    density="compact"
    variant="inset"
  >
    <div style="height:4px;width:100%;">
      <v-progress-linear
        v-if="fetchSubscriptions.loading.value"
        stream
        height="4"
        style="margin:0;"
      />
    </div>
    <template v-if="fetchSubscriptions.data.value">
      <v-expansion-panel
        v-for="subscription in fetchSubscriptions.data.value.results"
        :key="subscription._id"
      >
        <v-expansion-panel-title>{{ subscription.title }}</v-expansion-panel-title>
        <v-expansion-panel-text>
          <webhook-subscription-form
            :model-value="subscription"
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
            :model-value="{ topic, sender: sender ?? session.state.account }"
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
  email: email
</i18n>

<script lang="ts" setup>
import type { Event, WebhookSubscription } from '#api/types'

const {
  topic,
  sender,
  noSender
} = defineProps<{
  topic: { key: string, title: string }
  sender?: Event['sender']
  noSender: boolean
}>()

const { t } = useI18n()
const session = useSessionAuthenticated()

const currentPanel = ref<number | null>(null)

const subscriptionsParams = computed(() => ({
  recipient: session.state.user.id,
  topic: topic.key,
  sender: noSender ? 'none' : serializeSender(sender ?? session.state.account)
}))
const fetchSubscriptions = useFetch<{ results: WebhookSubscription[] }>($apiPath + '/webhook-subscriptions', { query: subscriptionsParams })

const onDeleted = async () => {
  await fetchSubscriptions.refresh()
  currentPanel.value = null
}

/*
export default {
  props: {
    topic: { type: Object, default: null },
    noSender: { type: Boolean, default: false },
    sender: { type: Object, default: null }
  },
  data: () => ({
    subscriptions: null,
    loading: true,
    currentPanel: null
  }),
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount'])
  },
  async mounted () {
    this.refresh()
  },
  methods: {
    async refresh (id) {
      this.loading = true
      const params = {
        recipient: this.user.id,
        topic: this.topic.key,
        size: 100
      }
      if (this.noSender) {
        params.noSender = 'true'
      } else if (this.sender) {
        params.sender = this.sender.type + ':' + this.sender.id
      } else {
        params.sender = this.activeAccount.type + ':' + this.activeAccount.id
      }
      this.subscriptions = (await this.$axios.$get('webhook-subscriptions', { params })).results

      this.loading = false

      if (id) {
        this.currentPanel = null
        await this.$nextTick()
        this.currentPanel = this.subscriptions.findIndex(s => s._id === id)
      }
    },
    async saveSubscription (subscription) {
      await this.$axios.$post('webhook-subscriptions', subscription)
    }
  }
} */
</script>

<style lang="css" scoped>
</style>
