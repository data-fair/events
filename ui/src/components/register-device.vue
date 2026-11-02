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
    :icon="mdiBellRing"
    color="primary"
    density="compact"
    variant="outlined"
  >
    {{ t('registerDevice') }}
    <template #append>
      <v-btn
        :loading="register.loading.value"
        color="primary"
        variant="flat"
        size="small"
        @click="register.execute()"
      >
        {{ t('register') }}
      </v-btn>
    </template>
  </v-alert>
</template>

<i18n lang="yaml">
fr:
  register: Recevoir ici
  registerDevice: Ce navigateur ne reçoit pas encore vos notifications.
  blocked: Les notifications sont bloquées pour ce site dans votre navigateur. Autorisez-les dans les paramètres du site (icône à gauche de l'adresse), puis rechargez la page.
  unsupported: L'envoi d'une notification à ce navigateur a échoué, il ne prend peut-être pas en charge les notifications push.
en:
  register: Receive here
  registerDevice: This browser does not receive your notifications yet.
  blocked: Notifications are blocked for this site in your browser. Allow them in the site settings (icon left of the address), then reload the page.
  unsupported: Sending a notification to this browser failed, it may not support push notifications.
</i18n>

<script lang="ts" setup>
import type { DeviceRegistration } from '#api/types'
import { mdiBellRing } from '@mdi/js'
import debugModule from 'debug'

const debug = debugModule('webpush')

const { registrations } = defineProps<{ registrations: DeviceRegistration[] }>()

const emit = defineEmits<{ registration: [DeviceRegistration] }>()

const { t } = useI18n()

const ready = ref(false)
const error = ref<string | null>()

const pushManagerSubscription = ref<PushSubscription | null>(null)

const prepareServiceWorker = async () => {
  // see web-push client example
  // https://github.com/alex-friedl/webpush-example/blob/master/client/main.js

  debug('prepare service worker')

  if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
    return console.warn('Notifications are not supported')
  }
  if (Notification.permission === 'denied') {
    // blocked before, the browser will not ask again: say how to unblock instead of showing nothing
    error.value = t('blocked')
    return
  }
  if (!('serviceWorker' in navigator)) {
    return console.warn('Service workers are not supported')
  }

  try {
    await navigator.serviceWorker.register($sitePath + '/events/push-sw.js')
    const serviceWorkerRegistration = await navigator.serviceWorker.ready
    pushManagerSubscription.value = await serviceWorkerRegistration.pushManager.getSubscription()
    if (pushManagerSubscription.value) {
      const registration = registrations.find(r => equalDeviceRegistrations(r.id, pushManagerSubscription.value))
      if (!registration) {
        debug('local subscription is not matched by remote, unsubscribe')
        await $fetch('ui-logs', { method: 'POST', body: { message: 'webpush - service worker subscription was not matched by remote info and was unsubscribed.' } })
        await pushManagerSubscription.value.unsubscribe()
        pushManagerSubscription.value = null
      } else {
        debug('refresh the registration so that it is identified as active')
        const refreshedRegistration = await $fetch<DeviceRegistration>('push/registrations', {
          body: { id: registration.id, type: registration.type, deviceName: registration.deviceName },
          method: 'POST'
        })
        debug('refreshedRegistration', refreshedRegistration)
        emit('registration', refreshedRegistration)
      }
    } else {
      debug('no existing subscription')
    }
    ready.value = true
  } catch (err) {
    console.error('Error while preparing for subscription', err)
  }
}
onMounted(() => {
  prepareServiceWorker()
})

watch(() => registrations, async () => {
  if (pushManagerSubscription.value) {
    const registration = registrations.find(r => equalDeviceRegistrations(r.id, pushManagerSubscription.value))
    if (!registration) {
      debug('local subscription was deleted, unsubscribe')
      await pushManagerSubscription.value.unsubscribe()
      pushManagerSubscription.value = null
    }
  }
})

const register = useAsyncAction(async () => {
  try {
    debug('register current device')
    const serviceWorkerRegistration = await navigator.serviceWorker.ready
    const vapidKey = await $fetch<{ publicKey: string }>('push/vapidkey')
    pushManagerSubscription.value = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey)
    })
    const registration: Partial<DeviceRegistration> = { id: pushManagerSubscription.value }
    const createdRegistration = await $fetch<DeviceRegistration>('push/registrations', { body: registration, method: 'POST' })
    debug('createdRegistration', createdRegistration)
    emit('registration', createdRegistration)
  } catch (err) {
    if (Notification.permission === 'denied') {
      ready.value = false
      console.warn('The user has blocked permissions')
      error.value = t('blocked')
    } else {
      console.error('Error while subscribing to service worker', err)
      error.value = t('unsupported')
    }
  }
})
</script>

<style lang="css" scoped>
</style>
