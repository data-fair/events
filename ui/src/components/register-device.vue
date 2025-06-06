<template>
  <v-alert
    v-if="error"
    type="error"
    density="compact"
    variant="outlined"
    class="py-1"
  >
    {{ error }}
  </v-alert>
  <v-alert
    v-else-if="ready && !pushManagerSubscription"
    color="accent"
    density="compact"
    variant="outlined"
    class="py-0 pr-0"
  >
    {{ t('registerDevice') }}
    <template #append>
      <v-btn
        variant="text"
        class="ml-1"
        @click="register"
      >
        {{ t('ok') }}
      </v-btn>
    </template>
  </v-alert>
</template>

<i18n lang="yaml">
fr:
  ok: ok
  registerDevice: Ajouter cet appareil comme destinataire permanent de vos notifications ?
</i18n>

<script lang="ts" setup>
import type { DeviceRegistration } from '#api/types'

const { registrations } = defineProps<{ registrations: DeviceRegistration[] }>()

const emit = defineEmits<{ registration: [DeviceRegistration] }>()

const { t } = useI18n()

const ready = ref(false)
const error = ref<string | null>()

const pushManagerSubscription = ref<PushSubscription | null>(null)

const prepareServiceWorker = async () => {
  // see web-push client example
  // https://github.com/alex-friedl/webpush-example/blob/master/client/main.js

  if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
    return console.log('Notifications are not supported')
  }
  if (Notification.permission === 'denied') {
    return console.log('The user has blocked permissions')
  }
  if (!('serviceWorker' in navigator)) {
    return console.log('Service workers are not supported')
  }

  try {
    await navigator.serviceWorker.register($sitePath + '/events/push-sw.js')
    const serviceWorkerRegistration = await navigator.serviceWorker.ready
    pushManagerSubscription.value = await serviceWorkerRegistration.pushManager.getSubscription()
    if (pushManagerSubscription.value) {
      const registration = registrations.find(r => equalDeviceRegistrations(r.id, pushManagerSubscription.value))
      if (!registration) {
        console.log('Local subscription is not matched by remote, unsubscribe')
        await pushManagerSubscription.value.unsubscribe()
        pushManagerSubscription.value = null
      } else {
        // refresh the registration so that it is identified as active
        const refreshedRegistration = await $fetch<DeviceRegistration>('push/registrations', { body: registration, method: 'POST' })
        emit('registration', refreshedRegistration)
      }
    } else {
      console.log('no existing subscription')
    }
    ready.value = true
  } catch (err) {
    console.error('Error while preparing for subscription', err)
  }
}
prepareServiceWorker()

const register = async () => {
  try {
    const serviceWorkerRegistration = await navigator.serviceWorker.ready
    const vapidKey = await $fetch<{ publicKey: string }>('push/vapidkey')
    pushManagerSubscription.value = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey)
    })
    const registration: Partial<DeviceRegistration> = { id: pushManagerSubscription.value }
    const createdRegistration = await $fetch<DeviceRegistration>('push/registrations', { body: registration, method: 'POST' })
    emit('registration', createdRegistration)
  } catch (err) {
    if (Notification.permission === 'denied') {
      ready.value = false
      console.log('The user has blocked permissions')
      error.value = 'Les notifications sont bloquées sur cet appareil pour cette application.'
    } else {
      console.error('Error while subscribing to service worker', err)
      error.value = 'Échec lors de l\'envoi d\'une notification à cet appareil. Votre navigateur n\'est peut-être pas compatible avec la fonctionnalité "push messaging".'
    }
  }
}
</script>

<style lang="css" scoped>
</style>
