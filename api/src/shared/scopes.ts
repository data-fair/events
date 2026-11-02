// The OAuth-style scope vocabulary events declares: a family, a tier (read < write < admin) and a
// bare umbrella per family, plus the global tier scopes all:read / all:write / all:admin shared by
// every service of the platform. Every session-facing route is listed in scopedOperations and
// guarded by requireOperationScope; any other route refuses scope-restricted sessions (lib-express).
// The OpenAPI document (api/contract/api-docs.ts) is built from the same table.
import type { RequestHandler } from 'express'
import type { ScopeTier } from '@data-fair/lib-common-types/scopes.js'
import { defineScopes } from '@data-fair/lib-common-types/scopes.js'
import { requireScope } from '@data-fair/lib-express/index.js'

// webhooks have no write tier: a webhook subscription sends the account's events to an outside URL,
// so managing them is admin tier and all:write does not grant it
export const vocabulary = defineScopes({
  notifications: {
    tiers: ['read', 'write'],
    descriptions: {
      umbrella: { fr: 'Tous les droits sur les notifications et abonnements', en: 'All notification and subscription scopes' },
      read: { fr: 'Lire ses notifications et ses abonnements', en: 'Read own notifications and subscriptions' },
      write: { fr: 'Créer et supprimer ses abonnements aux notifications', en: 'Create and delete own notification subscriptions' }
    }
  },
  events: {
    tiers: ['read'],
    descriptions: {
      umbrella: { fr: "Tous les droits sur le journal d'événements du compte", en: 'All account event log scopes' },
      read: { fr: "Lire le journal d'événements du compte", en: 'Read the account event log' }
    }
  },
  webhooks: {
    tiers: ['read', 'admin'],
    descriptions: {
      umbrella: { fr: 'Tous les droits sur les webhooks', en: 'All webhook scopes' },
      read: { fr: 'Lire les abonnements webhooks du compte et leurs envois', en: "Read the account's webhook subscriptions and deliveries" },
      admin: { fr: 'Gérer les webhooks : création, suppression, test, relance (envoie les événements du compte vers une URL externe)', en: "Manage webhooks: create, delete, test, retry (sends the account's events to an outside URL)" }
    }
  }
})
export const { acceptedScopes, scopeDescriptions } = vocabulary
export type ScopeFamily = typeof vocabulary.families[number]

export type ScopedOperation = { method: 'get' | 'post' | 'delete', path: string, family: ScopeFamily, tier: ScopeTier }

// paths are relative to /api, as in the OpenAPI document
export const scopedOperations = {
  listNotifications: { method: 'get', path: '/notifications', family: 'notifications', tier: 'read' },
  listSubscriptions: { method: 'get', path: '/subscriptions', family: 'notifications', tier: 'read' },
  getSubscription: { method: 'get', path: '/subscriptions/{id}', family: 'notifications', tier: 'read' },
  postSubscription: { method: 'post', path: '/subscriptions', family: 'notifications', tier: 'write' },
  deleteSubscription: { method: 'delete', path: '/subscriptions/{id}', family: 'notifications', tier: 'write' },
  listEvents: { method: 'get', path: '/events', family: 'events', tier: 'read' },
  listWebhookSubscriptions: { method: 'get', path: '/webhook-subscriptions', family: 'webhooks', tier: 'read' },
  postWebhookSubscription: { method: 'post', path: '/webhook-subscriptions', family: 'webhooks', tier: 'admin' },
  deleteWebhookSubscription: { method: 'delete', path: '/webhook-subscriptions/{id}', family: 'webhooks', tier: 'admin' },
  testNewWebhookSubscription: { method: 'post', path: '/webhook-subscriptions/_test', family: 'webhooks', tier: 'admin' },
  testWebhookSubscription: { method: 'post', path: '/webhook-subscriptions/{id}/_test', family: 'webhooks', tier: 'admin' },
  listWebhooks: { method: 'get', path: '/webhooks', family: 'webhooks', tier: 'read' },
  retryWebhook: { method: 'post', path: '/webhooks/{id}/_retry', family: 'webhooks', tier: 'admin' },
  cancelWebhook: { method: 'post', path: '/webhooks/{id}/_cancel', family: 'webhooks', tier: 'admin' }
} satisfies Record<string, ScopedOperation>

export type ScopedOperationId = keyof typeof scopedOperations

export const requireOperationScope = (operationId: ScopedOperationId): RequestHandler => {
  const operation: ScopedOperation | undefined = scopedOperations[operationId]
  if (!operation) throw new Error(`unknown scoped operation ${operationId}`)
  return requireScope(acceptedScopes(operation.family, operation.tier))
}

/** scopes accepted by a websocket channel, undefined refuses scope-restricted sessions */
export const channelScopes = (channel: string): string[] | undefined => {
  const [ownerType, , resource] = channel.split(':')
  if (ownerType === 'user' && resource === 'notifications') return acceptedScopes('notifications', 'read')
  if (resource?.startsWith('webhook-subscriptions/')) return acceptedScopes('webhooks', 'read')
}
