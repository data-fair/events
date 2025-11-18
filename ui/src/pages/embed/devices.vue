<template>
  <v-container
    fluid
    data-iframe-height
    class="bg-surface"
  >
    <v-row
      v-if="registrations"
      class="ma-0"
    >
      <register-device
        :registrations="registrations"
        @registration="(r: DeviceRegistration) => { localRegistration = r; fetchRegistrations.execute() }"
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
          @test="test.execute(i)"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import type { DeviceRegistration } from '#api/types'

const registrations = ref<DeviceRegistration[] | null>(null)
const fetchRegistrations = useAsyncAction(async () => {
  registrations.value = await $fetch<DeviceRegistration[]>('push/registrations')
})
fetchRegistrations.execute()

const localRegistration = ref<DeviceRegistration | null>(null)

const save = useAsyncAction(async () => {
  await $fetch('push/registrations', { body: registrations.value, method: 'PUT' })
  fetchRegistrations.execute()
})

const remove = (i: number) => {
  registrations.value?.splice(i, 1)
  save.execute()
}

const test = useAsyncAction(async (i: number) => {
  await $fetch(`push/registrations/${i}/_test`, { method: 'POST' })
  fetchRegistrations.execute()
})
</script>

<style>
</style>
