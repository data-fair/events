// operations.ts — pure functions only
// must not import #mongo, #config, or store state

import type { DeviceRegistration } from '#types'

export function equalDeviceRegistrations (regId1: DeviceRegistration['id'] | null, regId2: DeviceRegistration['id'] | null) {
  if (regId1 === null || regId2 === null) return false
  if (typeof regId1 === 'string' && typeof regId2 === 'string' && regId1 === regId2) return true
  if (typeof regId1 === 'object' && typeof regId2 === 'object' && regId1.endpoint === regId2.endpoint) return true
  return false
}
