// very basic mecanism to log client side events on the server

import { Router } from 'express'
import log from '@data-fair/lib-node/log.js'
import { describeUserAgent } from '../shared/user-agent.ts'
import { returnValid } from '#types/ui-log/index.js'

const router = Router()
export default router

// Get the list of subscriptions
router.post('', async (req, res, next) => {
  // a publicly opened POST endpoint is a little bit risky, we only accept very restricted body type
  const uiLog = returnValid(req.body)
  // the ip and the host come from the log context of the request
  log.info(uiLog.message, {
    code: 'ui-log',
    referrer: req.get('referer')?.slice(0, 1000),
    ua: describeUserAgent(req.headers['user-agent'])
  })
  res.send()
})
