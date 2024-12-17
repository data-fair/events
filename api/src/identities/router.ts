// Define a few routes to be used to synchronize data with the users/organizations directory
// Useful both for functionalities and help respect GDPR rules

import config from '#config'
import { createIdentitiesRouter } from '@data-fair/lib-express/identities/index.js'
import mongo from '#mongo'

export default createIdentitiesRouter(
  config.secretKeys.identities,
  // onUpdate
  async (identity) => {
    if (identity.type === 'user') {
      await mongo.notifications.updateMany({ 'recipient.id': identity.id }, { $set: { 'recipient.name': identity.name } })
      await mongo.subscriptions.updateMany({ 'recipient.id': identity.id }, { $set: { 'recipient.name': identity.name } })
    }
    await mongo.subscriptions.updateMany({ 'sender.type': identity.type, 'sender.id': identity.id }, { $set: { 'sender.name': identity.name } })
    await mongo.pushSubscriptions.updateMany({ 'owner.type': identity.type, 'owner.id': identity.id }, { $set: { 'owner.name': identity.name } })
    await mongo.webhookSubscriptions.updateMany({ 'sender.type': identity.type, 'sender.id': identity.id }, { $set: { 'sender.name': identity.name } })
    await mongo.webhookSubscriptions.updateMany({ 'owner.type': identity.type, 'owner.id': identity.id }, { $set: { 'owner.name': identity.name } })
    if (identity.departments) {
      for (const department of identity.departments.filter(d => !!d.name)) {
        await mongo.subscriptions.updateMany({ 'sender.type': identity.type, 'sender.id': identity.id, 'sender.department': department.id }, { $set: { 'sender.name': identity.name, 'sender.departmentName': department.name } })
        await mongo.pushSubscriptions.updateMany({ 'owner.type': identity.type, 'owner.id': identity.id, 'owner.department': department.id }, { $set: { 'owner.name': identity.name, 'owner.departmentName': department.name } })
        await mongo.webhookSubscriptions.updateMany({ 'sender.type': identity.type, 'sender.id': identity.id, 'sender.department': department.id }, { $set: { 'sender.name': identity.name, 'sender.departmentName': department.name } })
        await mongo.webhookSubscriptions.updateMany({ 'owner.type': identity.type, 'owner.id': identity.id, 'owner.department': department.id }, { $set: { 'owner.name': identity.name, 'owner.departmentName': department.name } })
      }
    }

    if (identity.type === 'user' && identity.organizations) {
      const privateSubscriptionFilter = {
        'recipient.id': identity.id,
        visibility: { $ne: 'public' as const },
        'sender.type': 'organization'
      }
      for await (const privateSubscription of mongo.subscriptions.find(privateSubscriptionFilter)) {
        let userOrg = identity.organizations.find(o => o.id === privateSubscription.sender.id && !o.department)
        if (privateSubscription.sender.department) {
          userOrg = userOrg || identity.organizations.find(o => o.id === privateSubscription.sender.id && o.department === privateSubscription.sender.department)
        }
        if (userOrg && privateSubscription.sender.role && userOrg.role !== privateSubscription.sender.role && userOrg.role !== 'admin') {
          userOrg = undefined
        }
        if (!userOrg) {
          // console.log('remove private subscription that does not match user orgs anymore', identity, privateSubscription)
          await mongo.subscriptions.deleteOne({ _id: privateSubscription._id })
        }
      }
    }
  },
  // onDelete
  async (identity) => {
    if (identity.type === 'user') {
      mongo.notifications.deleteMany({ 'recipient.id': identity.id })
      mongo.subscriptions.deleteMany({ 'recipient.id': identity.id })
    }
    await mongo.subscriptions.deleteMany({ 'sender.type': identity.type, 'sender.id': identity.id })
    await mongo.pushSubscriptions.deleteMany({ 'owner.type': identity.type, 'owner.id': identity.id })
    await mongo.webhookSubscriptions.deleteMany({ 'owner.type': identity.type, 'owner.id': identity.id })
    await mongo.webhookSubscriptions.deleteMany({ 'sender.type': identity.type, 'sender.id': identity.id })
  }
)
