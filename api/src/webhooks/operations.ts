// operations.ts — pure functions only
// must not import #mongo, #config, or store state

import type { Webhook } from '#types'
import { backoffMinutes } from '../shared/operations.ts'

export type CoalesceTarget = { _id: string, status: Webhook['status'], nextAttempt?: string }
export type CoalesceAction = { type: 'insert' } | { type: 'update', _id: string, status: Webhook['status'], resetStatus: boolean }

// decide what a coalesced event does to the deliveries already queued for the same
// subscription and topic key: an in-flight delivery is left alone (the newer signal must
// survive its completion), a retrying error keeps its backoff, anything else is reset
export const coalesceAction = (existing: CoalesceTarget[]): CoalesceAction => {
  const target = existing.find(w => w.status !== 'working')
  if (!target) return { type: 'insert' }
  const retrying = target.status === 'error' && !!target.nextAttempt
  return { type: 'update', _id: target._id, status: target.status, resetStatus: !retrying }
}

// ISO string, like the schema declares and the worker query compares against
export const nextAttemptDate = (nbAttempts: number, now = new Date()): string => {
  return new Date(now.getTime() + backoffMinutes(nbAttempts) * 60 * 1000).toISOString()
}
