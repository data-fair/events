import { test as teardown } from '@playwright/test'

teardown('Stateful tests teardown', async () => {
  if (process.env.TAIL_PID) {
    try { process.kill(-Number(process.env.TAIL_PID)) } catch (e) { /* ignore */ }
  }
})
