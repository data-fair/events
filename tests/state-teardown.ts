import { test as teardown } from '@playwright/test'

teardown('stop API server', async () => {
  const apiServer = await import('../api/src/server.ts')
  await apiServer.stop()
})
