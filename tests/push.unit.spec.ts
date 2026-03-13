import { test, expect } from '@playwright/test'
import { equalDeviceRegistrations } from '../api/src/push/operations.ts'

test.describe('equalDeviceRegistrations', () => {
  test('returns false for null first arg', () => {
    expect(equalDeviceRegistrations(null, 'abc')).toBe(false)
  })

  test('returns false for null second arg', () => {
    expect(equalDeviceRegistrations('abc', null)).toBe(false)
  })

  test('returns false for both null', () => {
    expect(equalDeviceRegistrations(null, null)).toBe(false)
  })

  test('returns true for equal strings', () => {
    expect(equalDeviceRegistrations('abc', 'abc')).toBe(true)
  })

  test('returns false for different strings', () => {
    expect(equalDeviceRegistrations('abc', 'def')).toBe(false)
  })

  test('returns true for objects with same endpoint', () => {
    expect(equalDeviceRegistrations(
      { endpoint: 'https://push.example.com/1' },
      { endpoint: 'https://push.example.com/1' }
    )).toBe(true)
  })

  test('returns false for objects with different endpoints', () => {
    expect(equalDeviceRegistrations(
      { endpoint: 'https://push.example.com/1' },
      { endpoint: 'https://push.example.com/2' }
    )).toBe(false)
  })

  test('returns false for mixed string and object', () => {
    expect(equalDeviceRegistrations('abc', { endpoint: 'abc' })).toBe(false)
  })
})
