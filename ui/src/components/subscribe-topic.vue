<template>
  <div>
    <v-switch
      :loading="loading"
      :disabled="loading"
      :label="topic.title"
      :model-value="!!subscription"
      color="primary"
      hide-details
      density="compact"
      @update:model-value="switchSubscription"
    />
    <!-- aligned on the label of the switch -->
    <div
      v-if="subscription && outputs.length"
      class="d-flex flex-wrap gc-4 ml-12 mt-n2"
    >
      <v-checkbox
        v-for="output of outputs"
        :key="output"
        v-model="subscription.outputs"
        :label="t(output)"
        :value="output"
        color="primary"
        density="compact"
        hide-details
        @update:model-value="sendSubscription.execute(subscription)"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
fr:
  devices: sur mes appareils
  email: par e-mail
en:
  devices: on my devices
  email: by email
</i18n>

<script lang="ts" setup>
import type { Event, Subscription } from '#api/types'

const {
  topic,
  icon,
  urlTemplate,
  outputs,
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
const subscription = ref<Subscription>()
watch(fetchSubscriptions.data, () => {
  subscription.value = fetchSubscriptions.data.value?.results[0]
})
watch(subscription, () => {
  if (subscription.value) topicsSubscriptions[topic.key] = subscription.value
  else delete topicsSubscriptions[topic.key]
})

// the hosts pass the sender as type:id[:department] in the URL: its name, when the session knows it,
// keeps the subscription readable in the recap of the user's subscriptions
const withName = (sender: Required<Subscription>['sender']) => {
  if (sender.name) return sender
  const user = session.state.user
  const name = sender.type === 'user' ? (sender.id === user.id ? user.name : undefined) : user.organizations.find(o => o.id === sender.id)?.name
  return name ? { ...sender, name } : sender
}

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
    if (!noSender) subscription.sender = withName(sender || session.state.account)
    if (icon) subscription.icon = icon
    if (urlTemplate) subscription.urlTemplate = urlTemplate
    await sendSubscription.execute(subscription)
    await fetchSubscriptions.refresh()
  } else {
    await $fetch('subscriptions/' + subscription.value._id, { method: 'DELETE' })
    await fetchSubscriptions.refresh()
  }
  switching.value = false
}

const sendSubscription = useAsyncAction(async (subscription: Partial<Subscription>) => {
  await $fetch('subscriptions', { method: 'POST', body: subscription })
})
</script>
