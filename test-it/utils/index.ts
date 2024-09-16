import type { AxiosAuthOpts } from '@data-fair/lib/node/axios-auth.js'

import { axiosBuilder } from '@data-fair/lib/node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib/node/axios-auth.js'
import mongo from '@data-fair/lib/node/mongo.js'

const directoryUrl = 'http://localhost:5600/simple-directory'

const axiosOpts = { baseURL: 'http://localhost:5600/events' }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

export const axiosAuth = (opts: string | Omit<AxiosAuthOpts, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  const password = opts.email === 'superadmin@test.com' ? 'superpasswd' : 'passwd'
  return _axiosAuth({ ...opts, password, axiosOpts, directoryUrl })
}

export const clean = async () => {
  for (const name of ['notifications', 'subscriptions', 'events', 'webhooks', 'webhook-subscriptions', 'pushSubscriptions']) {
    await mongo.db.collection(name).deleteMany({})
  }
}

export const startApiServer = async () => {
  // Before tests
  process.env.SUPPRESS_NO_CONFIG_WARNING = '1'
  process.env.NODE_CONFIG_DIR = 'api/config/'
  const apiServer = await import('../../api/src/server.ts')
  await apiServer.start()
}

export const stopApiServer = async () => {
  const apiServer = await import('../../api/src/server.ts')
  await apiServer.stop()
}
