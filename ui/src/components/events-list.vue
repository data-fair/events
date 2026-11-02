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
            <event-originator-avatar :event="event" />
          </template>
          <!-- the date on the line of the title: aligned on top, not centered on an item of several lines;
               under the title on a phone, where it would leave the title a narrow column -->
          <v-list-item-title class="d-flex flex-wrap flex-sm-nowrap align-baseline gc-4">
            <span class="text-wrap flex-grow-1">{{ event.title || event.topic.title }}</span>
            <!-- both, without hovering: how long ago at a glance, the exact date for the traceability (alone on a phone) -->
            <span class="text-body-small text-medium-emphasis text-no-wrap"><span class="d-none d-sm-inline">{{ dayjs(event.date).fromNow() }} · </span>{{ dayjs(event.date).format('lll') }}</span>
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
    <!-- the API pages by date with a next link, not with skip as useLoadMore -->
    <!-- hidden while a new search loads: its next page would be appended to the results of the new one -->
    <load-more-btn
      v-if="events.next && !fetchEvents.loading.value"
      :loading="fetchNextEvents.loading.value"
      @click="fetchNextEvents.execute()"
    />
  </template>
</template>

<i18n lang="yaml">
fr:
  noEvents: Aucune activité pour le moment.
  admin: Administrateur
  internalProcess: Processus interne
  apiKey: Clé d'API
en:
  noEvents: No activity yet.
  admin: Administrator
  internalProcess: Internal process
  apiKey: API key
</i18n>

<script lang="ts" setup>
import type { LocalizedEvent } from '#api/types'
import { mdiHistory } from '@mdi/js'
import EventOriginatorAvatar from '@data-fair/lib-vuetify-events/EventOriginatorAvatar.vue'
import { otherOrganization } from '@data-fair/lib-vuetify-events/originator.js'
import LayoutEmptyState from '@data-fair/lib-vuetify/layout-empty-state.vue'

type EventsRes = { results: LocalizedEvent[], next?: string }
type Resource = Required<LocalizedEvent>['resource']

const pageSize = 20
// the embed in a tab of the host grows with its content: a short first page, the next ones as everywhere
const { firstPageSize = pageSize } = defineProps<{ firstPageSize?: number }>()

const { t } = useI18n()
useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

const search = useStringSearchParam('q')
const resourceFilter = useStringSearchParam('resource')

const events = ref<EventsRes | null>(null)

// a response that comes back after a newer search started (or a next page after any reload) is dropped
let fetchId = 0
const fetchEvents = useAsyncAction(async () => {
  const id = ++fetchId
  const res = await $fetch<EventsRes>('events', { query: { q: search.value || undefined, resource: resourceFilter.value || undefined, size: firstPageSize } })
  if (id === fetchId) events.value = res
})
fetchEvents.execute()
watch(search, () => fetchEvents.execute())

const fetchNextEvents = useAsyncAction(async () => {
  if (!events.value?.next) return
  const id = fetchId
  // the next link repeats the size of the first page
  const nextEvents = await $fetch<EventsRes>(events.value.next, { query: { size: pageSize } })
  if (id !== fetchId || !events.value) return
  events.value.results = events.value.results.concat(nextEvents.results)
  events.value.next = nextEvents.next
})

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
