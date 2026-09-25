import { test, expect } from '@playwright/test'
import { coalesceAction, nextAttemptDate } from '../api/src/webhooks/operations.ts'

test.describe('coalesceAction', () => {
  test('inserts when nothing is pending', () => {
    expect(coalesceAction([])).toEqual({ type: 'insert' })
  })

  for (const status of ['waiting', 'ok', 'cancelled'] as const) {
    test(`resets a ${status} delivery to waiting`, () => {
      expect(coalesceAction([{ _id: 'a', status }])).toEqual({ type: 'update', _id: 'a', status, resetStatus: true })
    })
  }

  test('merges into a pending non-coalesced delivery', () => {
    // any waiting delivery for the same subscription and topic is replaced, whoever queued it
    expect(coalesceAction([{ _id: 'a', status: 'waiting' }])).toMatchObject({ type: 'update', _id: 'a' })
  })

  test('keeps backoff of a retrying error', () => {
    const existing = [{ _id: 'a', status: 'error' as const, nextAttempt: '2026-01-01T00:00:00.000Z' }]
    expect(coalesceAction(existing)).toEqual({ type: 'update', _id: 'a', status: 'error', resetStatus: false })
  })

  test('resets an error whose retries are exhausted', () => {
    expect(coalesceAction([{ _id: 'a', status: 'error' }])).toEqual({ type: 'update', _id: 'a', status: 'error', resetStatus: true })
  })

  test('inserts beside an in-flight delivery', () => {
    expect(coalesceAction([{ _id: 'a', status: 'working' }])).toEqual({ type: 'insert' })
  })

  test('prefers the pending delivery over a completed one', () => {
    // a delivery that completed while a newer one was queued must not be revived beside it
    const existing = [{ _id: 'a', status: 'ok' as const }, { _id: 'b', status: 'waiting' as const }]
    expect(coalesceAction(existing)).toEqual({ type: 'update', _id: 'b', status: 'waiting', resetStatus: true })
  })

  test('prefers the retrying delivery over a completed one, keeping its backoff', () => {
    const existing = [{ _id: 'a', status: 'ok' as const }, { _id: 'b', status: 'error' as const, nextAttempt: '2026-01-01T00:00:00.000Z' }]
    expect(coalesceAction(existing)).toEqual({ type: 'update', _id: 'b', status: 'error', resetStatus: false })
  })

  test('updates the non-working document beside an in-flight one', () => {
    const existing = [{ _id: 'a', status: 'working' as const }, { _id: 'b', status: 'waiting' as const }]
    expect(coalesceAction(existing)).toEqual({ type: 'update', _id: 'b', status: 'waiting', resetStatus: true })
  })
})

test.describe('nextAttemptDate', () => {
  test('is an ISO string comparable with the worker query', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    // backoffMinutes(1) = 1
    expect(nextAttemptDate(1, now)).toBe('2026-01-01T00:01:00.000Z')
  })
})
