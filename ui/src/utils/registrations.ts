import type { DeviceRegistration } from '#api/types'

export function urlBase64ToUint8Array (base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function equalDeviceRegistrations (regId1: DeviceRegistration['id'] | null | undefined, regId2: DeviceRegistration['id'] | null | undefined) {
  if (!regId1 || !regId2) return false
  if (typeof regId1 === 'string' && typeof regId2 === 'string' && regId1 === regId2) return true
  if (typeof regId1 === 'object' && typeof regId2 === 'object' && regId1.endpoint === regId2.endpoint) return true
  return false
}
