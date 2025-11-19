// very basic mecanism to log client side events on the server

import { Router } from 'express'
import useragent from 'useragent'
import { returnValid } from '#types/ui-log/index.js'

const router = Router()
export default router

// Get the list of subscriptions
router.post('', async (req, res, next) => {
  // a publicly opened POST endpoint is a little bit risky, we only accept very restricted body type
  const uiLog = returnValid(req.body)
  const fullUiLogs = {
    ...uiLog,
    referrer: req.get('referer'),
    ua: useragent.parse(req.headers['user-agent']).toString(),
    ip: req?.get('X-Client-IP')
  }
  console.log('ui-log:' + JSON.stringify(fullUiLogs))
  res.send()
})
