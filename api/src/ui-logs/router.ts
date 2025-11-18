// very basic mecanism to log client side events on the server

import { httpError } from '@data-fair/lib-express'
import { Router } from 'express'
import useragent from 'useragent'

const router = Router()
export default router

// Get the list of subscriptions
router.post('', async (req, res, next) => {
  // a publicly opened POST endpoint is a little bit risky, we only accept very restricted body type
  if (typeof req.body !== 'string') throw httpError(400, 'ui-log should only contain text')
  if (req.body.length > 1000) throw httpError(400, 'ui-log should not contain more than 1000 chars')
  const uiLogs = {
    message: req.body,
    referrer: req.get('referer'),
    ua: useragent.parse(req.headers['user-agent']).toString(),
    ip: req?.get('X-Client-IP')
  }
  console.log('ui-log:' + JSON.stringify(uiLogs))
  res.send()
})
