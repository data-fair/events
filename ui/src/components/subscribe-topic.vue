<template>
  <v-col class="py-0 px-1">
    <v-switch
      class="mt-1"
      :loading="loading"
      :disabled="loading"
      :label="topic.title"
      color="primary"
      hide-details
      density="compact"
      :model-value="!!subscription"
      @update:model-value="switchSubscription"
    />

    <template v-if="subscription">
      <v-checkbox
        v-if="outputs.includes('devices')"
        v-model="subscription.outputs"
        color="primary"
        density="compact"
        hide-details
        class="ml-10 mt-0"
        :label="t('devices')"
        value="devices"
        @update:model-value="sendSubscription(subscription)"
      />
      <v-checkbox
        v-if="outputs.includes('email')"
        v-model="subscription.outputs"
        color="primary"
        density="compact"
        hide-details
        class="ml-10 mt-0"
        :label="t('email')"
        value="email"
        @update:model-value="sendSubscription(subscription)"
      />
    </template>
  </v-col>
</template>

<i18n lang="yaml">
fr:
  devices: notification sur appareils configurés
  email: email
  sendError: "L'enregistrement de l'abonnement a échoué: "
en:
  sendError: "Saving subscription failed : "
</i18n>

<script lang="ts" setup>
import type { Event, Subscription } from '#api/types'

const {
  topic,
  icon,
  urlTemplate,
  // eslint-disable-next-line vue/require-valid-default-prop
  outputs = ['email', 'devices'],
  sender,
  noSender
} = defineProps<{
  topic: { key: string, title: string }
  icon?: string
  urlTemplate?: string
  outputs: string[]
  sender?: Event['sender']
  noSender: boolean
}>()

const { t, locale } = useI18n()
const session = useSessionAuthenticated()
const { topicsSubscriptions } = useSubscriptions()

const subscriptionsParams = computed(() => ({
  recipient: session.state.user.id,
  topic: topic.key,
  sender: noSender ? 'none' : serializeSender(sender ?? session.state.account)
}))
const fetchSubscriptions = useFetch<{ results: Subscription[] }>($apiPath + '/subscriptions', { query: subscriptionsParams })
const subscription = computed(() => fetchSubscriptions.data.value?.results[0])
watch(subscription, () => {
  if (subscription.value) topicsSubscriptions[topic.key] = subscription.value
  else delete topicsSubscriptions[topic.key]
})

const switching = ref(false)
const loading = computed(() => switching.value || !fetchSubscriptions.data?.value)

const switchSubscription = async () => {
  switching.value = true
  if (!subscription.value) {
    const subscription: Partial<Subscription> = {
      recipient: { id: session.state.user.id, name: session.state.user.name },
      topic,
      outputs: [],
      locale: locale.value as Subscription['locale']
    }
    if (!noSender) subscription.sender = sender || session.state.account
    if (icon) subscription.icon = icon
    if (urlTemplate) subscription.urlTemplate = urlTemplate
    await sendSubscription(subscription)
    await fetchSubscriptions.refresh()
  } else {
    await $fetch('subscriptions/' + subscription.value._id, { method: 'DELETE' })
    await fetchSubscriptions.refresh()
  }
  switching.value = false
}

const sendSubscription = withUiNotif(async (subscription: Partial<Subscription>) => {
  await $fetch('subscriptions', { method: 'POST', body: subscription })
})
</script>

<style lang="css" scoped>
</style>
