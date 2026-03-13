import type { AxiosAuthOptions } from '@data-fair/lib-node/axios-auth.js'

import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'
import mongo from '@data-fair/lib-node/mongo.js'

const nginxPort = process.env.NGINX_PORT || '5600'

const directoryUrl = `http://localhost:${nginxPort}/simple-directory`

export const baseURL = `http://localhost:${nginxPort}/events`

const axiosOpts = { baseURL }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

export const axiosAuth = (opts: string | Omit<AxiosAuthOptions, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  const password = opts.email === 'superadmin@test.com' ? 'superpasswd' : 'passwd'
  return _axiosAuth({ ...opts, password, axiosOpts, directoryUrl })
}

export const clean = async () => {
  for (const name of ['notifications', 'subscriptions', 'events', 'webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
    await mongo.db.collection(name).deleteMany({})
  }
}
