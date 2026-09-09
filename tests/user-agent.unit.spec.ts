import { test, expect } from '@playwright/test'
import { describeUserAgent } from '../api/src/shared/user-agent.ts'

test.describe('describeUserAgent', () => {
  test('describes a desktop chrome on windows', () => {
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'))
      .toBe('Chrome 131.0.0.0 / Windows 10')
  })

  test('distinguishes edge from chrome', () => {
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'))
      .toBe('Microsoft Edge 131.0.0.0 / Windows 10')
  })

  test('describes safari on ios', () => {
    expect(describeUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'))
      .toBe('Safari 17.6 / iOS 17.6.1')
  })

  test('describes chrome on android', () => {
    expect(describeUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'))
      .toBe('Chrome 131.0.0.0 / Android 14')
  })

  test('omits the os version when it is unknown', () => {
    expect(describeUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0'))
      .toBe('Firefox 133.0 / Linux')
  })

  test('falls back to Other for an unrecognized agent', () => {
    expect(describeUserAgent('curl/8.5.0')).toBe('Other')
  })

  test('falls back to Other for an empty or missing agent', () => {
    expect(describeUserAgent('')).toBe('Other')
    expect(describeUserAgent(undefined)).toBe('Other')
  })
})
