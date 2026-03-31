import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'unit', testMatch: /.*\.unit\.spec\.ts/ },
    { name: 'state-setup', testMatch: /state-setup\.ts/, teardown: 'state-teardown' },
    { name: 'state-teardown', testMatch: /state-teardown\.ts/ },
    { name: 'api', testMatch: /.*\.api\.spec\.ts/, dependencies: ['state-setup'] },
    {
      name: 'e2e',
      testMatch: /.*\.e2e\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['state-setup'],
    },
  ]
})
