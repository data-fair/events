/**
 * The OpenAPI document of this service, served at /events/api/api-docs.json.
 *
 * data-fair aggregates the documents of the platform services: the oauth2 scheme declares the
 * scopes events enforces (api/src/shared/scopes.ts) and, in x-scopeIncludes, which of them each
 * global tier scope (all:read, all:write, all:admin) includes. Only the session-facing operations
 * are listed, each with the scopes it accepts; the internal secret routes are not.
 */
import pJson from '../../package.json' with { type: 'json' }
import { acceptedScopes, scopeDescriptions, scopeIncludes, scopedOperations } from '../src/shared/scopes.ts'

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

export const apiDocs = (serverUrl: string, directoryUrl: string, locale: 'fr' | 'en') => {
  const paths: Record<string, Record<string, any>> = {}
  for (const [operationId, op] of Object.entries(scopedOperations) as [keyof typeof scopedOperations, typeof scopedOperations[keyof typeof scopedOperations]][]) {
    const operation: Record<string, any> = {
      operationId,
      summary: summaries[operationId],
      parameters: [
        ...(op.path.includes('{id}') ? [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }] : []),
        ...(parameters[operationId] ?? [])
      ],
      security: [{ sdCookie: [] }, { oauth2: acceptedScopes(op.family, op.tier) }],
      responses: { 200: { description: 'OK' } }
    }
    const body = bodies[operationId]
    if (body) operation.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', description: body } } } }
    paths[op.path] = { ...paths[op.path], [op.method]: operation }
  }
  return {
    openapi: '3.1.0',
    info: { title: 'API events', version: pJson.version },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        sdCookie: { type: 'apiKey', in: 'cookie', name: 'id_token' },
        oauth2: {
          type: 'oauth2',
          description: "Jeton d'accès délivré par l'échange de jeton des identités non humaines de simple-directory (assertion JWT bearer, RFC 7523, aucun secret client). Un jeton sans claim de scope est une session de premier niveau, non restreinte. Un jeton avec scope ne donne accès qu'aux opérations couvertes par ses scopes.",
          flows: {
            clientCredentials: {
              tokenUrl: `${directoryUrl}/api/auth/nhi-token`,
              scopes: scopeDescriptions(locale)
            }
          },
          'x-scopeIncludes': scopeIncludes
        }
      }
    },
    paths
  }
}
