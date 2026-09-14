// Synchronize the copies of identity data (names on senders, recipients, owners, originators)
// with the users/organizations directory, and remove them when an identity is deleted.

import type { Filter } from 'mongodb'
import type { IdentityUpdate, IdentityDelete } from '@data-fair/lib-express/identities/index.js'
import type { SearchableEvent } from '#types'
import config from '#config'
import mongo from '#mongo'
import { buildSearchTexts } from '../events/operations.ts'

// events are rewritten one by one: the names are also part of the _search texts
const rewriteEvents = async (filter: Filter<SearchableEvent>, rewrite: (event: SearchableEvent) => void) => {
  for await (const event of mongo.events.find(filter)) {
    rewrite(event)
    const $set: Partial<SearchableEvent> = { _search: buildSearchTexts(event, config.i18n.locales, config.i18n.defaultLocale) }
    if (event.sender) $set.sender = event.sender
    if (event.originator) $set.originator = event.originator
    await mongo.events.updateOne({ _id: event._id }, { $set })
  }
}

export const updateIdentity = async (identity: IdentityUpdate) => {
  const { type, id, name, departments } = identity

  if (type === 'user') {
    await mongo.notifications.updateMany({ 'recipient.id': id }, { $set: { 'recipient.name': name } })
    await mongo.subscriptions.updateMany({ 'recipient.id': id }, { $set: { 'recipient.name': name } })
  }
  // notifications are snapshots taken at delivery, their sender name is not rewritten (no index on sender)
  await mongo.subscriptions.updateMany({ 'sender.type': type, 'sender.id': id }, { $set: { 'sender.name': name } })
  await mongo.pushSubscriptions.updateMany({ 'owner.type': type, 'owner.id': id }, { $set: { 'owner.name': name } })
  await mongo.webhookSubscriptions.updateMany({ 'sender.type': type, 'sender.id': id }, { $set: { 'sender.name': name } })
  await mongo.webhookSubscriptions.updateMany({ 'owner.type': type, 'owner.id': id }, { $set: { 'owner.name': name } })
  if (departments) {
    for (const department of departments.filter(d => !!d.name)) {
      await mongo.subscriptions.updateMany({ 'sender.type': type, 'sender.id': id, 'sender.department': department.id }, { $set: { 'sender.name': name, 'sender.departmentName': department.name } })
      await mongo.pushSubscriptions.updateMany({ 'owner.type': type, 'owner.id': id, 'owner.department': department.id }, { $set: { 'owner.name': name, 'owner.departmentName': department.name } })
      await mongo.webhookSubscriptions.updateMany({ 'sender.type': type, 'sender.id': id, 'sender.department': department.id }, { $set: { 'sender.name': name, 'sender.departmentName': department.name } })
      await mongo.webhookSubscriptions.updateMany({ 'owner.type': type, 'owner.id': id, 'owner.department': department.id }, { $set: { 'owner.name': name, 'owner.departmentName': department.name } })
    }
  }

  // events: as sender, and as the user or organization that triggered them
  const eventsFilter: Filter<SearchableEvent>[] = [{ 'sender.type': type, 'sender.id': id }]
  if (type === 'user') eventsFilter.push({ 'originator.user.id': id })
  else eventsFilter.push({ 'originator.organization.id': id })
  await rewriteEvents({ $or: eventsFilter }, (event) => {
    if (event.sender?.type === type && event.sender.id === id) {
      event.sender.name = name
      const department = event.sender.department && departments?.find(d => d.id === event.sender?.department)
      if (department) event.sender.departmentName = department.name
    }
    if (type === 'user' && event.originator?.user?.id === id) {
      event.originator.user.name = name
    }
    if (type === 'organization' && event.originator?.organization?.id === id) {
      event.originator.organization.name = name
      const department = event.originator.organization.department && departments?.find(d => d.id === event.originator?.organization?.department)
      if (department) event.originator.organization.departmentName = department.name
    }
  })

  if (type === 'user' && identity.organizations) {
    const privateSubscriptionFilter = {
      'recipient.id': id,
      visibility: { $ne: 'public' as const },
      'sender.type': 'organization'
    }
    for await (const privateSubscription of mongo.subscriptions.find(privateSubscriptionFilter)) {
      let userOrg = identity.organizations.find(o => o.id === privateSubscription.sender?.id && !o.department)
      if (privateSubscription.sender?.department) {
        userOrg = userOrg || identity.organizations.find(o => o.id === privateSubscription.sender?.id && o.department === privateSubscription.sender.department)
      }
      if (userOrg && privateSubscription.sender?.role && userOrg.role !== privateSubscription.sender.role && userOrg.role !== 'admin') {
        userOrg = undefined
      }
      if (!userOrg) {
        // remove private subscription that does not match user orgs anymore
        await mongo.subscriptions.deleteOne({ _id: privateSubscription._id })
      }
    }
  }
}

export const deleteIdentity = async (identity: IdentityDelete) => {
  const { type, id } = identity

  if (type === 'user') {
    await mongo.notifications.deleteMany({ 'recipient.id': id })
    await mongo.subscriptions.deleteMany({ 'recipient.id': id })
    await mongo.pointers.deleteMany({ 'recipient.id': id })
  }
  await mongo.subscriptions.deleteMany({ 'sender.type': type, 'sender.id': id })
  await mongo.pushSubscriptions.deleteMany({ 'owner.type': type, 'owner.id': id })
  await mongo.webhookSubscriptions.deleteMany({ 'owner.type': type, 'owner.id': id })
  await mongo.webhookSubscriptions.deleteMany({ 'sender.type': type, 'sender.id': id })
  // pending or failed webhooks of the deleted subscriptions
  await mongo.webhooks.deleteMany({ 'owner.type': type, 'owner.id': id })
  await mongo.webhooks.deleteMany({ 'sender.type': type, 'sender.id': id })

  // the events of the identity are its own feed, nobody else can read them
  await mongo.events.deleteMany({ 'sender.type': type, 'sender.id': id })
  // the events a user triggered on other feeds keep the trace of the action without the person:
  // only the id remains (pseudonymized), an organization is not personal data and is left as is
  if (type === 'user') {
    await rewriteEvents({ 'originator.user.id': id }, (event) => {
      if (event.originator?.user) {
        delete event.originator.user.name
        delete event.originator.user.email
      }
    })
  }
}
