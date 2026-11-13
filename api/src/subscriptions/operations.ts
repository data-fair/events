// operations.ts — pure functions only
// must not import #mongo, #config, or store state

import type { Subscription } from '#types'
import type { User } from '@data-fair/lib-express/index.js'

export const canSubscribePrivate = (sender: Subscription['sender'], user: User) => {
  // super admin can do whatever he wants
  if (user.adminMode) return true
  if (!sender) return false

  // user sends to himself ?
  if (sender.type === 'user') return sender.id === user.id

  if (sender.type === 'organization') {
    let userOrg = user.organizations.find(o => o.id === sender.id && !o.department)
    if (sender.department) {
      userOrg = user.organizations.find(o => o.id === sender.id && o.department === sender.department) || userOrg
    }
    if (!userOrg) return false
    if (sender.role && sender.role !== userOrg.role && userOrg.role !== 'admin') return false
    return true
  }
}

// the language the notifications of a subscription are written in: the one given by the caller
// (the subscribe embed sends the language of its interface), else the one already stored on an update,
// else the session language of the request (a service subscribing server side forwards the user's cookie).
// Any language is accepted: event texts are open records, a missing language falls back on the default one
export const subscriptionLocale = (bodyLocale: Subscription['locale'], existingLocale: Subscription['locale'], sessionLang: string | undefined): Subscription['locale'] => {
  return bodyLocale || existingLocale || sessionLang || undefined
}
