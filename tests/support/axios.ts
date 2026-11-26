import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'
import { prefix } from './sd-fixtures.ts'

const devHost = process.env.DEV_HOST || 'localhost'
const nginxPort = process.env.NGINX_PORT || '5600'
const devApiPort = process.env.DEV_API_PORT || '5600'

export const directoryUrl = `http://${devHost}:${nginxPort}/simple-directory`

export const baseURL = `http://${devHost}:${nginxPort}/events`
export const devBaseURL = `http://localhost:${devApiPort}`

const axiosOpts = { baseURL }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

const anonymousAx = axios()

export const axiosAuth = (user: string, opts?: { adminMode?: boolean }) => {
  const password = 'passwd'
  return _axiosAuth({ email: user + '@test.com', password, adminMode: opts?.adminMode, axiosOpts, directoryUrl })
}

// what the accounts of the test sub-space (test_events_) own, the other sub-spaces are left alone
export const clean = async () => {
  await anonymousAx.delete(`http://localhost:${devApiPort}/api/test-env`, { params: { prefix } })
}
