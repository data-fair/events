<template>
  <v-container
    fluid
    data-iframe-height
    class="bg-surface"
  >
    <v-alert
      v-if="!session.state.user"
      type="error"
      variant="outlined"
      class="my-1"
    >
      {{ t('loginRequired') }}
    </v-alert>
    <template v-else>
      <register-device
        v-if="hasDeviceOutput && reactiveSearchParams.register !== 'false' && fetchRegistrations.data.value"
        :registrations="fetchRegistrations.data.value"
        class="mb-4"
        @registration="fetchRegistrations.refresh()"
      />
      <div
        v-if="header"
        class="text-label-large mb-2"
      >
        {{ header }}
      </div>
      <template v-if="outputs">
        <subscribe-topic
          v-for="(topic, i) in topics"
          :key="topic.key"
          :topic="topic"
          :no-sender="!!reactiveSearchParams.noSender"
          :icon="reactiveSearchParams.icon"
          :url-template="reactiveSearchParams['url-template']"
          :outputs="outputs"
          :sender="(senders.length === 1 ? senders[0] : senders[i]) || null"
        />
      </template>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifyMe: "Paramètre manquant | Me notifier de cet évènement : | Me notifier de ces évènements :"
  loginRequired: Vous devez être connecté pour recevoir des notifications.
en:
  notifyMe: "Missing parameter | Send me notifications for this event: | Send me notifications for these events:"
  loginRequired: You must be logged in to receive notifications.
</i18n>

<script setup lang="ts">
import type { DeviceRegistration } from '#api/types'

const reactiveSearchParams = useReactiveSearchParams()
const querySenders = useStringsArraySearchParam('sender')
const keys = useStringsArraySearchParam('key')
const titles = useStringsArraySearchParam('title')

const { t } = useI18n()

const topics = computed(() => keys.value.map((key, i) => ({ key, title: titles.value[i] })))
const senders = computed(() => querySenders.value.filter(Boolean).map(parseSender).filter(s => s !== 'none'))
const header = computed(() => {
  if (reactiveSearchParams.header === 'no') return ''
  return reactiveSearchParams.header || t('notifyMe', topics.value.length)
})

const session = useSession()
const { topicsSubscriptions } = useSubscriptions()

const hasDeviceOutput = computed(() => !!topics.value.find(t => topicsSubscriptions[t.key]?.outputs.includes('devices')))

const fetchRegistrations = useFetch<DeviceRegistration[]>($apiPath + '/push/registrations')

const outputs = computed(() => {
  if (!fetchRegistrations.data.value) return null
  if (reactiveSearchParams.outputs === 'auto') {
    // always devices then email, whatever the mode
    return fetchRegistrations.data.value.find(r => !r.disabled) ? ['devices', 'email'] : ['email']
  } else {
    return ['devices', 'email']
  }
})
</script>

<style lang="css" scoped>
</style>
