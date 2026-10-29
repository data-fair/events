<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-progress-linear
      v-if="!registrations"
      indeterminate
      color="primary"
    />
    <template v-else>
      <register-device
        :registrations="registrations"
        class="mb-4"
        @registration="(r: DeviceRegistration) => { localRegistration = r; fetchRegistrations.execute() }"
      />
      <p
        v-if="!registrations.length"
        class="text-body-medium text-medium-emphasis"
      >
        {{ t('noDevices') }}
      </p>
      <v-list
        v-else
        class="py-0 border-sm rounded"
      >
        <template
          v-for="(registration, i) of registrations"
          :key="i"
        >
          <v-divider v-if="i > 0" />
          <device-item
            :registration="registration"
            :is-local="equalDeviceRegistrations(localRegistration?.id, registration.id)"
            :testing="test.loading.value && testedIndex === i"
            @delete="remove.execute(i)"
            @test="test.execute(i)"
          />
        </template>
      </v-list>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  noDevices: Aucun appareil ne reçoit vos notifications.
en:
  noDevices: No device receives your notifications.
</i18n>

<script lang="ts" setup>
import type { DeviceRegistration } from '#api/types'

const { t } = useI18n()

const registrations = ref<DeviceRegistration[] | null>(null)
const fetchRegistrations = useAsyncAction(async () => {
  registrations.value = await $fetch<DeviceRegistration[]>('push/registrations')
})
fetchRegistrations.execute()

const localRegistration = ref<DeviceRegistration | null>(null)

const remove = useAsyncAction(async (i: number) => {
  registrations.value?.splice(i, 1)
  await $fetch('push/registrations', { body: registrations.value, method: 'PUT' })
  fetchRegistrations.execute()
})

const testedIndex = ref<number>()
const test = useAsyncAction(async (i: number) => {
  testedIndex.value = i
  await $fetch(`push/registrations/${i}/_test`, { method: 'POST' })
  fetchRegistrations.execute()
})
</script>
