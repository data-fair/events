// The OAuth-style scope vocabulary events declares: a family, a tier (read < write < admin) and a
// bare umbrella per family, plus the global tier scopes all:read / all:write / all:admin shared by
// every service of the platform. Every session-facing route is listed in scopedOperations and
// guarded by requireOperationScope; any other route refuses scope-restricted sessions (lib-express).
// The OpenAPI document (api/contract/api-docs.ts) is built from the same table.
import type { RequestHandler } from 'express'
import { requireScope } from '@data-fair/lib-express/index.js'

export type ScopeFamily = 'notifications' | 'events' | 'webhooks'
export type ScopeTier = 'read' | 'write' | 'admin'

const tiers: ScopeTier[] = ['read', 'write', 'admin']
const families: ScopeFamily[] = ['notifications', 'events', 'webhooks']

// webhooks have no write tier: a webhook subscription sends the account's events to an outside URL,
// so managing them is admin tier and all:write does not grant it
export const familyTiers: Record<ScopeFamily, ScopeTier[]> = {
  notifications: ['read', 'write'],
  events: ['read'],
  webhooks: ['read', 'admin']
}

const higherOrEqual = (tier: ScopeTier) => tiers.slice(tiers.indexOf(tier))

/** a higher tier covers the lower ones, the umbrella and the global tier scopes cover the family */
export const acceptedScopes = (family: ScopeFamily, tier: ScopeTier): string[] => [
  ...familyTiers[family].filter(t => higherOrEqual(tier).includes(t)).map(t => `${family}:${t}`),
  family,
  ...higherOrEqual(tier).map(t => `all:${t}`)
]

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

const descriptions: Record<'fr' | 'en', Record<string, string>> = {
  fr: {
    notifications: 'Tous les droits sur les notifications et abonnements',
    'notifications:read': 'Lire ses notifications et ses abonnements',
    'notifications:write': 'Créer et supprimer ses abonnements aux notifications',
    events: "Tous les droits sur le journal d'événements du compte",
    'events:read': "Lire le journal d'événements du compte",
    webhooks: 'Tous les droits sur les webhooks',
    'webhooks:read': 'Lire les abonnements webhooks du compte et leurs envois',
    'webhooks:admin': 'Gérer les webhooks : création, suppression, test, relance (envoie les événements du compte vers une URL externe)',
    'all:read': 'Lire tout ce que permet le rôle, sur tous les services',
    'all:write': 'Lire et modifier tout ce que permet le rôle, sur tous les services',
    'all:admin': 'Tous les droits que permet le rôle, sur tous les services'
  },
  en: {
    notifications: 'All notification and subscription scopes',
    'notifications:read': 'Read own notifications and subscriptions',
    'notifications:write': 'Create and delete own notification subscriptions',
    events: 'All account event log scopes',
    'events:read': 'Read the account event log',
    webhooks: 'All webhook scopes',
    'webhooks:read': "Read the account's webhook subscriptions and deliveries",
    'webhooks:admin': "Manage webhooks: create, delete, test, retry (sends the account's events to an outside URL)",
    'all:read': 'Read everything the role allows, across services',
    'all:write': 'Read and edit everything the role allows, across services',
    'all:admin': 'Every right the role allows, across services'
  }
}

export const scopeDescriptions = (locale: 'fr' | 'en'): Record<string, string> => ({ ...descriptions[locale] })

/** the events scopes each global tier scope includes (flat, lower tiers included) */
export const scopeIncludes = Object.fromEntries(tiers.map(tier => [
  `all:${tier}`,
  tiers.slice(0, tiers.indexOf(tier) + 1)
    .flatMap(t => families.filter(f => familyTiers[f].includes(t)).map(f => `${f}:${t}`))
])) as Record<'all:read' | 'all:write' | 'all:admin', string[]>
