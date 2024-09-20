<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-alert
      v-if="!session.state.user"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      Vous devez être connecté pour pouvoir recevoir des notifications.
    </v-alert>
    <template v-else>
      <v-row v-if="hasDeviceOutput && reactiveSearchParams.register !== 'false' && fetchRegistrations.data.value && fetchRegistrations.status.value !== 'pending'">
        <register-device
          :registrations="fetchRegistrations.data.value"
          @registration="fetchRegistrations.refresh()"
        />
      </v-row>
      <v-row v-if="header">
        <v-col>
          <div class="text-subtitle-2">
            {{ header }}
          </div>
        </v-col>
      </v-row>
      <v-row
        v-for="(topic, i) in topics"
        :key="topic.key"
        class="ma-0"
      >
        <subscribe-topic
          v-if="outputs"
          :topic="topic"
          :no-sender="!!reactiveSearchParams.noSender"
          :icon="reactiveSearchParams.icon"
          :url-template="reactiveSearchParams['url-template']"
          :outputs="outputs"
          :sender="senders[i] || null"
        />
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifyMe: "Paramètre manquant | Me notifier de cet évènement : | Me notifier de ces évènements :"
en:
  notifyMe: "Missing parameter | Send me notifications for this event : | Send me notifications for these events :"
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

const fetchRegistrations = useFetch<DeviceRegistration[]>('/events/api/v1/push/registrations', { lazy: true })

const outputs = computed(() => {
  if (!fetchRegistrations.data.value) return null
  if (reactiveSearchParams.outputs === 'auto') {
    const outputs = ['email']
    if (fetchRegistrations.data.value.find(r => !r.disabled)) outputs.push('devices')
    return outputs
  } else {
    return ['devices', 'email']
  }
})
</script>

<style lang="css" scoped>
</style>
