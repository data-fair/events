/**
 * The OpenAPI document of this service, served at /events/api/api-docs.json.
 *
 * data-fair merges the documents of the platform services into one document per site: it fetches
 * this one over the private url, so it does not depend on the request origin (paths relative to
 * the site, data-fair sets the origin and the token url of each site). The oauth2 scheme declares
 * the scopes events enforces (api/src/shared/scopes.ts). Only the session-facing operations are
 * listed, each with every scope it accepts as its own alternative (standard OpenAPI: the scopes of
 * one requirement are all needed); the internal secret routes are not.
 */
import pJson from '../../package.json' with { type: 'json' }
import { oauth2SecurityScheme, oauth2Alternatives } from '@data-fair/lib-common-types/scopes.js'
import { vocabulary, acceptedScopes, scopedOperations } from '../src/shared/scopes.ts'

const summaries: Record<keyof typeof scopedOperations, string> = {
  listNotifications: 'Lister ses notifications',
  listSubscriptions: 'Lister ses abonnements aux notifications',
  getSubscription: 'Lire un abonnement aux notifications',
  postSubscription: 'Créer ou modifier un abonnement aux notifications',
  deleteSubscription: 'Supprimer un abonnement aux notifications',
  listEvents: "Lister le journal d'événements du compte actif",
  listWebhookSubscriptions: 'Lister les abonnements webhooks du compte actif',
  postWebhookSubscription: 'Créer ou modifier un abonnement webhook',
  deleteWebhookSubscription: 'Supprimer un abonnement webhook',
  testWebhookSubscription: "Tester l'envoi d'un abonnement webhook",
  listWebhooks: 'Lister les envois de webhooks du compte actif',
  retryWebhook: "Relancer l'envoi d'un webhook",
  cancelWebhook: "Annuler l'envoi d'un webhook"
}

const query = (name: string, description: string, type = 'string') => ({ in: 'query', name, description, schema: { type } })
const pagination = [query('size', 'Nombre de résultats', 'integer'), query('skip', 'Nombre de résultats à sauter', 'integer')]
const parameters: Partial<Record<keyof typeof scopedOperations, any[]>> = {
  listNotifications: pagination,
  listSubscriptions: [...pagination, query('topic', 'Clé du sujet'), query('sender', 'Émetteur, "type:id[:département[:rôle]]" ou "none"')],
  listEvents: [query('size', 'Nombre de résultats', 'integer'), query('before', 'Date et identifiant du dernier événement de la page précédente, "date/id"'), query('q', 'Recherche textuelle')],
  listWebhookSubscriptions: [...pagination, query('topic', 'Clés de sujets séparées par des virgules'), query('sender', 'Émetteur, "type:id" ou "none"')],
  listWebhooks: [...pagination, query('subscription', "Identifiant de l'abonnement webhook")]
}
const bodies: Partial<Record<keyof typeof scopedOperations, string>> = {
  postSubscription: 'Un abonnement (schéma https://github.com/data-fair/events/subscription)',
  postWebhookSubscription: 'Un abonnement webhook (schéma https://github.com/data-fair/events/webhook-subscription)'
}

export const apiDocs = (locale: 'fr' | 'en') => {
  const paths: Record<string, Record<string, any>> = {}
  for (const [operationId, op] of Object.entries(scopedOperations) as [keyof typeof scopedOperations, typeof scopedOperations[keyof typeof scopedOperations]][]) {
    const operation: Record<string, any> = {
      operationId,
      summary: summaries[operationId],
      parameters: [
        ...(op.path.includes('{id}') ? [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }] : []),
        ...(parameters[operationId] ?? [])
      ],
      security: [{ sdCookie: [] }, ...oauth2Alternatives(acceptedScopes(op.family, op.tier))],
      responses: { 200: { description: 'OK' } }
    }
    const body = bodies[operationId]
    if (body) operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', description: body } } } }
    paths[op.path] = { ...paths[op.path], [op.method]: operation }
  }
  return {
    openapi: '3.1.0',
    info: { title: 'API events', version: pJson.version },
    servers: [{ url: '/events/api' }],
    components: {
      securitySchemes: {
        sdCookie: { type: 'apiKey', in: 'cookie', name: 'id_token' },
        oauth2: oauth2SecurityScheme(vocabulary, { directoryUrl: '/simple-directory', locale })
      }
    },
    paths
  }
}
