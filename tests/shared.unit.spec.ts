import { test, expect } from '@playwright/test'
import { backoffMinutes } from '../api/src/shared/operations.ts'

test.describe('backoffMinutes', () => {
  test('returns 1 for 1 error', () => {
    expect(backoffMinutes(1)).toBe(1)
  })

  test('returns 6 for 2 errors', () => {
    // Math.ceil(2^2.5) = Math.ceil(5.656) = 6
    expect(backoffMinutes(2)).toBe(6)
  })

  test('returns 16 for 3 errors', () => {
    // Math.ceil(3^2.5) = Math.ceil(15.588) = 16
    expect(backoffMinutes(3)).toBe(16)
  })

  test('returns 32 for 4 errors', () => {
    // Math.ceil(4^2.5) = Math.ceil(32) = 32
    expect(backoffMinutes(4)).toBe(32)
  })

  test('grows super-linearly', () => {
    const b3 = backoffMinutes(3)
    const b5 = backoffMinutes(5)
    const b9 = backoffMinutes(9)
    expect(b5).toBeGreaterThan(b3)
    expect(b9).toBeGreaterThan(b5)
    // ratio should increase
    expect(b9 / b5).toBeGreaterThan(b5 / b3)
  })
})
