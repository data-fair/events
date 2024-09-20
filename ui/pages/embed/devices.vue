<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-row
      v-if="registrations"
      class="ma-0"
    >
      <register-device
        :registrations="registrations"
        @registration="r => { localRegistration = r; fetchRegistrations() }"
      />
    </v-row>
    <v-row v-if="registrations">
      <v-col
        v-for="(registration, i) of registrations"
        :key="i"
        cols="12"
        md="6"
        lg="4"
        xl="3"
      >
        <device-card
          :registration="registration"
          :is-local="equalDeviceRegistrations(localRegistration?.id, registration.id)"
          @delete="remove(i)"
          @test="test(i)"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import type { DeviceRegistration } from '#api/types'

const loading = ref(false)
const registrations = ref<DeviceRegistration[] | null>(null)
const fetchRegistrations = withFatalError(async () => {
  loading.value = true
  registrations.value = await $fetch<DeviceRegistration[]>('/events/api/v1/push/registrations')
  loading.value = false
})
fetchRegistrations()

const localRegistration = ref<DeviceRegistration | null>(null)

const save = withFatalError(async () => {
  await $fetch('/events/api/v1/push/registrations', { body: registrations.value, method: 'PUT' })
  fetchRegistrations()
})

const remove = (i: number) => {
  registrations.value?.splice(i, 1)
  save()
}

const test = withFatalError(async (i: number) => {
  await $fetch(`/events/api/v1/push/registrations/${i}/_test`, { method: 'POST' })
})
</script>

<style>
</style>
