import { test as setup } from '@playwright/test'

setup('start API server', async () => {
  process.env.SUPPRESS_NO_CONFIG_WARNING = '1'
  process.env.NODE_CONFIG_DIR = 'api/config/'
  const apiServer = await import('../api/src/server.ts')
  await apiServer.start()
})
