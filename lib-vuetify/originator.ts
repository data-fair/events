import type { Event } from '@data-fair/lib-common-types/event/index.js'

// an organization different from the sender: a partner, or a user acting from another account
export const otherOrganization = (event: Pick<Event, 'originator' | 'sender'>) => {
  const organization = event.originator?.organization
  return !!organization && (event.sender?.type !== 'organization' || organization.id !== event.sender.id)
}
