<template>
  <v-progress-linear
    v-if="!events"
    indeterminate
    color="primary"
  />
  <layout-empty-state
    v-else-if="!events.results.length"
    :has-search="!!search"
    :icon="mdiHistory"
    :no-data-text="t('noEvents')"
  />
  <template v-else>
    <v-progress-linear
      :active="fetchEvents.loading.value"
      indeterminate
      color="primary"
    />
    <v-list class="py-0 border-sm rounded">
      <template
        v-for="(event, i) of events.results"
        :key="event._id"
      >
        <v-divider v-if="i > 0" />
        <v-list-item lines="two">
          <template #prepend>
            <v-avatar
              v-if="event.originator?.user?.admin"
              v-tooltip="t('admin')"
              :icon="mdiShieldAlert"
              :size="28"
              color="admin"
            />
            <v-avatar
              v-else-if="event.originator?.internalProcess"
              v-tooltip="t('internalProcess')"
              :icon="mdiCogRefresh"
              :size="28"
              color="primary"
            />
            <v-avatar
              v-else-if="event.originator?.apiKey"
              v-tooltip="t('apiKey')"
              :icon="mdiApi"
              :size="28"
              color="primary"
            />
            <owner-avatar
              v-else-if="otherOrganization(event)"
              :owner="{ type: 'organization', ...event.originator!.organization! }"
            />
            <owner-avatar
              v-else-if="event.originator?.user"
              :owner="{ type: 'user', ...event.originator.user }"
            />
            <v-avatar
              v-else
              :icon="mdiHistory"
              :size="28"
            />
          </template>
          <!-- the date on the line of the title: aligned on top, not centered on an item of several lines -->
          <v-list-item-title class="d-flex align-baseline ga-4">
            <span class="text-wrap flex-grow-1">{{ event.title || event.topic.title }}</span>
            <!-- both, without hovering: how long ago at a glance, the exact date for the traceability -->
            <span class="text-body-small text-medium-emphasis text-no-wrap">{{ dayjs(event.date).fromNow() }} · {{ dayjs(event.date).format('lll') }}</span>
          </v-list-item-title>
          <v-list-item-subtitle>
            <span>{{ originatorLabel(event) }}</span>
            <template v-if="event.resource && !isFilteredResource(event.resource)">
              <span v-if="originatorLabel(event)"> · </span>
              <a
                v-if="resourceUrl(event.resource)"
                :href="resourceUrl(event.resource)"
                target="_blank"
                class="text-primary"
              >{{ event.resource.title || event.resource.id }}</a>
              <span v-else>{{ event.resource.title || event.resource.id }}</span>
            </template>
          </v-list-item-subtitle>
          <!-- outside the subtitle: its line clamp would hide the body of a two-line item -->
          <div
            v-if="event.body"
            class="text-body-medium text-medium-emphasis"
          >
            {{ event.body }}
          </div>
        </v-list-item>
      </template>
    </v-list>
    <v-btn
      v-if="events.next"
      :loading="fetchNextEvents.loading.value"
      variant="text"
      color="primary"
      class="mt-2"
      block
      @click="fetchNextEvents.execute()"
    >
      {{ t('seeMore') }}
    </v-btn>
  </template>
</template>

<i18n lang="yaml">
fr:
  seeMore: Voir plus
  noEvents: Aucune activité pour le moment.
  admin: Administrateur
  internalProcess: Processus interne
  apiKey: Clé d'API
en:
  seeMore: See more
  noEvents: No activity yet.
  admin: Administrator
  internalProcess: Internal process
  apiKey: API key
</i18n>

<script lang="ts" setup>
import type { LocalizedEvent } from '#api/types'
import { mdiApi, mdiCogRefresh, mdiHistory, mdiShieldAlert } from '@mdi/js'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'
import LayoutEmptyState from '@data-fair/lib-vuetify/layout-empty-state.vue'

type EventsRes = { results: LocalizedEvent[], next?: string }
type Resource = Required<LocalizedEvent>['resource']

const { t } = useI18n()
useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

const search = useStringSearchParam('q')
const resourceFilter = useStringSearchParam('resource')

const events = ref<EventsRes | null>(null)

const fetchEvents = useAsyncAction(async () => {
  events.value = await $fetch<EventsRes>('events', { query: { q: search.value || undefined, resource: resourceFilter.value || undefined } })
})
fetchEvents.execute()
watch(search, () => fetchEvents.execute())

const fetchNextEvents = useAsyncAction(async () => {
  if (!events.value?.next) return
  const nextEvents = await $fetch<EventsRes>(events.value.next)
  events.value.results = events.value.results.concat(nextEvents.results)
  events.value.next = nextEvents.next
})

// an organization different from the sender: a partner, or a user acting from another account
const otherOrganization = (event: LocalizedEvent) => {
  const organization = event.originator?.organization
  return !!organization && (event.sender?.type !== 'organization' || organization.id !== event.sender.id)
}

// a name alone is ambiguous in a traceability log: always followed by the id (or the email of a user)
const withId = (name: string | undefined, id: string | undefined) => {
  if (name && id && name !== id) return `${name} (${id})`
  return name || id || ''
}

const originatorLabel = (event: LocalizedEvent) => {
  const originator = event.originator
  if (!originator) return ''
  if (originator.internalProcess) return withId(originator.internalProcess.title || t('internalProcess'), originator.internalProcess.id)
  if (originator.apiKey) return withId(originator.apiKey.title || t('apiKey'), originator.apiKey.id)
  const parts: string[] = []
  const user = originator.user
  // the API hides the identity of a platform admin from the other users
  if (user?.admin) parts.push(user.name ? `${withId(user.name, user.email || user.id)}, ${t('admin').toLowerCase()}` : t('admin'))
  else if (user) parts.push(withId(user.name, user.email || user.id))
  if (otherOrganization(event)) parts.push(withId(originator.organization!.name, originator.organization!.id))
  return parts.filter(Boolean).join(' / ')
}

// in the traceability tab of a resource, repeating that resource on every line says nothing
const isFilteredResource = (resource: Resource) => resourceFilter.value === `${resource.type}/${resource.id}`

const resourceUrl = (resource: Resource) => {
  if (resource.type === 'dataset') return `${$sitePath}/data-fair/dataset/${resource.id}`
  if (resource.type === 'application') return `${$sitePath}/data-fair/application/${resource.id}`
  if (resource.type === 'processing') return `${$sitePath}/data-fair/processings/${resource.id}`
  if (resource.type === 'catalog') return `${$sitePath}/data-fair/catalogs/${resource.id}`
}
</script>
