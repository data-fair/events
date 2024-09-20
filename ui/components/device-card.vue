<template>
  <v-alert
    :elevation="isLocal ? 8 : 0"
    :color="color"
    :variant="isLocal ? 'elevated' : 'outlined'"
    class="pa-0"
  >
    <v-card-title>
      <v-icon
        v-if="registration.type === 'webpush'"
        :color="color"
      >
        mdi-web
      </v-icon>
      <v-icon
        v-else
        :color="color"
      >
        mdi-cellphone
      </v-icon>
      &nbsp;
      {{ registration.deviceName }}
      &nbsp;
      <v-btn
        icon
        size="small"
        density="comfortable"
        color="warning"
        title="supprimer cet appareil"
        @click="emit('delete')"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      {{ infos }}
    </v-card-text>
    <v-card-action>
      <v-btn
        color="primary"
        variant="text"
        @click="emit('test')"
      >
        tester
      </v-btn>
    </v-card-action>
  </v-alert>
</template>

<script lang="ts" setup>
import type { DeviceRegistration } from '#api/types'

const { registration, isLocal } = defineProps<{ registration: DeviceRegistration, isLocal: boolean }>()
const emit = defineEmits<{ delete: [], test: [] }>()

const { dayjs } = useLocaleDayjs()

const temporarilyDisabled = computed(() => registration.disabledUntil && registration.disabledUntil > new Date().toISOString())
const infos = computed(() => {
  const infos = []
  if (registration.date) {
    infos.push(`crée ${dayjs(registration.date).fromNow()}`)
  }
  if (registration.lastSuccess) {
    infos.push(`dernier message ${dayjs(registration.lastSuccess).fromNow()}`)
  }
  if (registration.disabled === 'errors') {
    infos.push('désactivé pour cause d\'erreurs répétées')
  }
  if (registration.disabled === 'gone') {
    infos.push('expiré')
  }
  if (temporarilyDisabled.value) {
    infos.push('désactivé temporairement pour cause d\'erreur')
  }
  return infos.join(', ')
})
const color = computed(() => {
  if (registration.disabled === 'gone') return 'grey'
  if (registration.disabled === 'errors') return 'error'
  if (temporarilyDisabled.value) return 'warning'
  return null
})
</script>

<style>

</style>
