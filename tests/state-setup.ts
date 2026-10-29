import assert from 'node:assert/strict'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { test as setup } from '@playwright/test'

const anonymousAx = axiosBuilder()

setup('Stateful tests setup', async () => {
  await assert.doesNotReject(anonymousAx.get(`http://localhost:${process.env.DEV_API_PORT}/api/ping`),
    `Dev API server seems to be unavailable.
If you are an agent, read its logs with "npx --no df-dev logs api" and report the problem to your user (or "npx --no df-dev restart api" if the pane exited).`)
  await assert.doesNotReject(anonymousAx.get(`http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}/simple-directory`),
    'Simple Directory server seems to be unavailable. If you are an agent, check "npx --no df-dev status" and report this problem to your user.')
})
