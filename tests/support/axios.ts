import type { AxiosAuthOptions } from '@data-fair/lib-node/axios-auth.js'

import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'

const nginxPort = process.env.NGINX_PORT || '5600'
const devApiPort = process.env.DEV_API_PORT || '5600'

const directoryUrl = `http://localhost:${nginxPort}/simple-directory`

export const baseURL = `http://localhost:${nginxPort}/events`
export const devBaseURL = `http://localhost:${devApiPort}`

const axiosOpts = { baseURL }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

const anonymousAx = axios()

export const axiosAuth = (opts: string | Omit<AxiosAuthOptions, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  const password = opts.email === 'superadmin@test.com' ? 'superpasswd' : 'passwd'
  return _axiosAuth({ ...opts, password, axiosOpts, directoryUrl })
}

export const clean = async () => {
  await anonymousAx.delete(`http://localhost:${devApiPort}/api/test-env`)
}
