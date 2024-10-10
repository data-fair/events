<template>
  <v-list-item>
    <template #prepend>
      <div class="mr-4">
        <v-progress-circular
          v-if="webhook.status === 'working' || webhook.status === 'waiting'"
          :size="20"
          color="primary"
          indeterminate
        />
        <v-icon
          v-if="webhook.status === 'error'"
          color="error"
        >
          mdi-alert-circle
        </v-icon>
        <v-icon
          v-if="webhook.status === 'cancelled'"
          color="error"
        >
          mdi-cancel
        </v-icon>
        <v-icon
          v-if="webhook.status === 'ok'"
          color="success"
        >
          mdi-check-circle
        </v-icon>
      </div>
    </template>

    <v-list-item-title>
      {{ dayjs(webhook.notification.date).format('LLL') }} - {{ t(webhook.status) }}
      <template v-if="webhook.status === 'error' && webhook.lastAttempt">
        {{ webhook.lastAttempt.status || webhook.lastAttempt.error }}
      </template>
    </v-list-item-title>
    <v-list-item-subtitle>
      {{ description }}
    </v-list-item-subtitle>

    <template #append>
      <v-menu
        v-if="webhook.status !== 'waiting' && webhook.status !== 'working'"
        location="left"
      >
        <template #activator="{ props }">
          <v-btn
            icon
            variant="flat"
            v-bind="props"
          >
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item @click="retry">
            <template #append>
              <v-icon color="primary">
                mdi-send
              </v-icon>
            </template>

            <v-list-item-title>
              {{ t('retry') }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-list-item>
</template>

<i18n lang="yaml">
fr:
  waiting: en attente
  working: en cours
  error: erreur
  ok: ok
  cancelled: annulé
  nbAttempts: "Aucune tentative | 1 tentative | {nbAttempts} tentatives"
  lastAttempt: "dernière {date}"
  nextAttempt: "prochaine {date}"
  retry: renvoyer
  cancel: annuler
en:
  waiting: waiting
  working: working
  error: error
  ok: ok
  cancelled: cancelled
  nbAttempts: "No attempt | 1 attempt | {nbAttempts} attempts"
  lastAttempt: "last {date}"
  nextAttempt: "next {date}"
  retry: retry
  cancel: cancel
</i18n>

<script lang="ts" setup>
import type { Webhook } from '#api/types'

const { webhook } = defineProps<{ webhook: Webhook }>()
const emit = defineEmits<{ refresh: [] }>()

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const description = computed(() => {
  const parts = []
  parts.push(t('nbAttempts', webhook.nbAttempts, { plural: webhook.nbAttempts }))
  if (webhook.lastAttempt) parts.push(t('lastAttempt', { date: dayjs(webhook.lastAttempt.date).format('LLL') }))
  if (webhook.nextAttempt) parts.push(t('nextAttempt', { date: dayjs(webhook.nextAttempt).format('LLL') }))
  return parts.join(' - ')
})

const retry = withFatalError(async () => {
  await $fetch(`/events/api/v1/webhooks/${webhook._id}/_retry`, { method: 'POST' })
  emit('refresh')
})

/* const cancel = withFatalError(async () => {
  await $fetch(`/events/api/v1/webhooks/${webhook._id}/_cancel`, { method: 'POST' })
  emit('refresh')
}) */
</script>

<style>

</style>
