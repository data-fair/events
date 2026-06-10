import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'dot',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`,
    trace: 'on-first-retry',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },

  projects: [
    { name: 'unit', testMatch: /.*\.unit\.spec\.ts/ },
    { name: 'state-setup', testMatch: /state-setup\.ts/, teardown: 'state-teardown' },
    { name: 'state-teardown', testMatch: /state-teardown\.ts/ },
    { name: 'api', testMatch: /.*\.api\.spec\.ts/, dependencies: ['state-setup'] },
    {
      // the first hit on each Vite dev route triggers an on-demand compile that
      // can exceed the per-test timeout; warm them up once before the e2e specs
      name: 'e2e-warmup',
      testMatch: /e2e-warmup\.ts/,
      dependencies: ['state-setup'],
      timeout: 120_000,
      use: { ...devices['Desktop Chrome'], actionTimeout: 60_000, navigationTimeout: 60_000 },
    },
    {
      name: 'e2e',
      testMatch: /.*\.e2e\.spec\.ts/,
      dependencies: ['e2e-warmup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ]
})
