// Synchronize the copies of identity data (names on senders, recipients, owners, originators)
// with the users/organizations directory, and remove them when an identity is deleted.
// Everything is done with bulk updates: an organization can own tens of thousands of events and
// simple-directory waits for the response (names are kept out of the search texts for this reason).

import type { IdentityUpdate, IdentityDelete } from '@data-fair/lib-express/identities/index.js'
import mongo from '#mongo'

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
    // the directory sends the complete list of departments: a department missing from it was
    // deleted, what it owns keeps the id (still reachable by the organization admins) but not the name
    const deletedDepartment = { $exists: true, $nin: departments.map(d => d.id) }
    await mongo.subscriptions.updateMany({ 'sender.type': type, 'sender.id': id, 'sender.department': deletedDepartment }, { $unset: { 'sender.departmentName': 1 } })
    await mongo.pushSubscriptions.updateMany({ 'owner.type': type, 'owner.id': id, 'owner.department': deletedDepartment }, { $unset: { 'owner.departmentName': 1 } })
    await mongo.webhookSubscriptions.updateMany({ 'sender.type': type, 'sender.id': id, 'sender.department': deletedDepartment }, { $unset: { 'sender.departmentName': 1 } })
    await mongo.webhookSubscriptions.updateMany({ 'owner.type': type, 'owner.id': id, 'owner.department': deletedDepartment }, { $unset: { 'owner.departmentName': 1 } })
  }

  // events: as sender, and as the user or organization that triggered them
  await mongo.events.updateMany({ 'sender.type': type, 'sender.id': id }, { $set: { 'sender.name': name } })
  if (departments) {
    for (const department of departments.filter(d => !!d.name)) {
      await mongo.events.updateMany({ 'sender.type': type, 'sender.id': id, 'sender.department': department.id }, { $set: { 'sender.departmentName': department.name } })
      await mongo.events.updateMany({ 'originator.organization.id': id, 'originator.organization.department': department.id }, { $set: { 'originator.organization.departmentName': department.name } })
    }
    const deletedDepartment = { $exists: true, $nin: departments.map(d => d.id) }
    await mongo.events.updateMany({ 'sender.type': type, 'sender.id': id, 'sender.department': deletedDepartment }, { $unset: { 'sender.departmentName': 1 } })
    await mongo.events.updateMany({ 'originator.organization.id': id, 'originator.organization.department': deletedDepartment }, { $unset: { 'originator.organization.departmentName': 1 } })
  }
  if (type === 'user') {
    await mongo.events.updateMany({ 'originator.user.id': id }, { $set: { 'originator.user.name': name } })
  } else {
    await mongo.events.updateMany({ 'originator.organization.id': id }, { $set: { 'originator.organization.name': name } })
  }

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
    await mongo.events.updateMany({ 'originator.user.id': id }, { $unset: { 'originator.user.name': 1, 'originator.user.email': 1 } })
  }
}
