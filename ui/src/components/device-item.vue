<template>
  <v-list-item lines="two">
    <template #prepend>
      <v-icon
        :icon="/iOS|Android/i.test(registration.deviceName) ? mdiCellphone : mdiLaptop"
        :color="color"
      />
    </template>
    <v-list-item-title>
      {{ registration.deviceName }}
      <v-chip
        v-if="isLocal"
        size="x-small"
        color="primary"
        variant="outlined"
        class="ml-2"
      >
        {{ t('thisDevice') }}
      </v-chip>
    </v-list-item-title>
    <v-list-item-subtitle :class="color && `text-${color}`">
      {{ infos }}
    </v-list-item-subtitle>
    <template #append>
      <v-btn
        :loading="testing"
        :disabled="!!registration.disabled"
        variant="text"
        color="primary"
        size="small"
        @click="emit('test')"
      >
        {{ t('test') }}
      </v-btn>
      <!-- vuetify shrinks a menu to the room left in the iframe, not below min-height: the card then overflows,
           d-frame measures it (data-iframe-height) and grows the iframe of an embed sized to a single device -->
      <v-menu
        :close-on-content-click="false"
        max-width="500"
        min-height="180"
        location="bottom end"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :icon="mdiDelete"
            :title="t('removeDevice')"
            :aria-label="t('removeDevice')"
            variant="text"
            color="warning"
            size="small"
          />
        </template>
        <template #default="{ isActive }">
          <v-card
            :title="t('removeDevice')"
            data-iframe-height
          >
            <v-card-text>
              {{ t('removeText') }}
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                variant="text"
                @click="isActive.value = false"
              >
                {{ t('cancel') }}
              </v-btn>
              <v-btn
                color="warning"
                variant="flat"
                @click="isActive.value = false; emit('delete')"
              >
                {{ t('remove') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </template>
      </v-menu>
    </template>
  </v-list-item>
</template>

<i18n lang="yaml">
fr:
  thisDevice: cet appareil
  added: ajouté {date}
  lastSuccess: dernière notification reçue {date}
  errors: désactivé après 10 échecs d'envoi, réactivé à la prochaine ouverture de cette page sur l'appareil
  gone: expiré, à enregistrer de nouveau depuis l'appareil
  temporarilyDisabled: désactivé temporairement après une erreur
  test: Tester
  removeDevice: Retirer cet appareil
  removeText: Il ne recevra plus vos notifications. Vous pourrez l'enregistrer de nouveau depuis l'appareil lui-même.
  remove: Retirer
  cancel: Annuler
en:
  thisDevice: this device
  added: added {date}
  lastSuccess: last notification received {date}
  errors: disabled after 10 failed sends, enabled again next time this page is opened on the device
  gone: expired, register it again from the device
  temporarilyDisabled: temporarily disabled after an error
  test: Test
  removeDevice: Remove this device
  removeText: It will no longer receive your notifications. You can register it again from the device itself.
  remove: Remove
  cancel: Cancel
</i18n>

<script lang="ts" setup>
import type { DeviceRegistration } from '#api/types'
import { mdiLaptop } from '@mdi/js'

const { registration, isLocal, testing } = defineProps<{ registration: DeviceRegistration, isLocal: boolean, testing?: boolean }>()
const emit = defineEmits<{ delete: [], test: [] }>()

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const temporarilyDisabled = computed(() => registration.disabledUntil && registration.disabledUntil > new Date().toISOString())
const infos = computed(() => {
  if (registration.disabled === 'gone') return t('gone')
  if (registration.disabled === 'errors') return t('errors')
  const infos = []
  if (temporarilyDisabled.value) infos.push(t('temporarilyDisabled'))
  if (registration.lastSuccess) infos.push(t('lastSuccess', { date: dayjs(registration.lastSuccess).fromNow() }))
  else if (registration.date) infos.push(t('added', { date: dayjs(registration.date).fromNow() }))
  return infos.join(' · ')
})
const color = computed(() => {
  if (registration.disabled === 'gone') return 'disabled'
  if (registration.disabled === 'errors') return 'error'
  if (temporarilyDisabled.value) return 'warning'
})
</script>
