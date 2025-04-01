<template>
  <v-container
    v-if="events"
    data-iframe-height
  >
    <v-navigation-drawer
      v-if="$vuetify.display.lgAndUp"
      class="pl-2"
      permanent
      floating
      location="right"
      position="fixed"
      style="padding-top: 60px; background-color: transparent;"
    >
      <events-actions v-model:search="search" />
    </v-navigation-drawer>
    <v-menu
      v-else
      location="bottom left"
      :close-on-content-click="false"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          size="small"
          color="primary"
          :icon="mdiDotsVertical"
          style="z-index: 1000; position: fixed; right: 20px;"
        />
      </template>
      <events-actions v-model:search="search" />
    </v-menu>
    <v-progress-linear
      v-if="fetchEvents.loading.value"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <p v-else-if="events.results.length === 0">
      Aucun résultat
    </p>

    <v-expansion-panels
      v-else
      variant="accordion"
      elevation="0"
      class="border"
    >
      <v-expansion-panel
        v-for="(event, i) of events.results"
        :key="i"
      >
        <v-expansion-panel-title>
          <span class="mr-4">
            <v-avatar
              v-if="event.originator?.internalProcess"
              v-tooltip="'Processus interne'"
              :icon="mdiCogRefresh"
            />
            <v-avatar
              v-else-if="event.originator?.apiKey"
              v-tooltip="'Clé d\'API'"
              :icon="mdiApi"
            />
            <owner-avatar
              v-else-if="event.originator?.organization && (event.sender.type !== 'organization' || event.originator.organization.id !== event.sender.id)"
              :owner="{type: 'organization', ...event.originator.organization}"
            />
            <owner-avatar
              v-else-if="event.originator?.user"
              :owner="{type: 'user', ...event.originator.user}"
            />
          </span>
          {{ event.title }}
          <v-spacer />
          <span class="mr-4">{{ dayjs(event.date).fromNow() }}</span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <span class="mr-4">{{ dayjs(event.date).format('LLL') }}</span>
          <br>
          <template v-if="event.originator">
            <span
              v-if="event.originator.internalProcess"
              class="mr-4"
            >{{ event.originator.internalProcess.title || 'processus interne' }} <template v-if="event.originator.internalProcess.id">({{ event.originator.internalProcess.id }})</template>
            </span>
            <span
              v-if="event.originator.apiKey"
              class="mr-4"
            >{{ event.originator.apiKey.title || 'clé d\'API' }} <template v-if="event.originator.apiKey.id">({{ event.originator.apiKey.id }})</template>
            </span>
            <span
              v-if="event.originator.user"
              class="mr-4"
            >{{ event.originator.user.name }} ({{ event.originator.user.email || event.originator.user.id }})</span>
            <span
              v-if="event.originator?.organization && (event.sender.type !== 'organization' || event.originator.organization.id !== event.sender.id)"
              class="mr-4"
            >{{ event.originator.organization.name }} ({{ event.originator.organization.id }})</span>
          </template>
          <template v-if="event.resource">
            <br>
            <a
              v-if="event.resource.type === 'dataset'"
              :href="`/data-fair/datasets/${event.resource.id}`"
            >{{ event.resource.title }}</a>
            <a
              v-else-if="event.resource.type === 'processing'"
              :href="`/data-fair/extra/processings?p=.%2F${event.resource.id}`"
            >{{ event.resource.title }}</a>
            <span v-else-if="event.resource.title">{{ event.resource.type }} / {{ event.resource.title }} ({{ event.resource.id }})</span>
            <span v-else>{{ event.resource.type }} / {{ event.resource.id }}</span>
          </template>
          <template v-if="event.body">
            <br>
            <span>{{ event.body }}</span>
          </template>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <div
      v-if="events && events.next && !fetchEvents.loading.value && !fetchNextEvents.loading.value"
      class="mt-3"
    >
      <v-btn
        variant="flat"
        block
        @click="fetchNextEvents.execute()"
      >
        {{ t('seeMore') }}
      </v-btn>
    </div>
  </v-container>
</template>

<i18n lang="yaml">
  fr:
    seeMore: "Voir plus"
  en:
    seeMore: "See more"
</i18n>

<script lang="ts" setup>
import type { LocalizedEvent } from '#api/types'
import { mdiDotsVertical, mdiApi, mdiCogRefresh } from '@mdi/js'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'

type EventsRes = { results: LocalizedEvent[], next?: string }

const { t } = useI18n()
useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

const search = useStringSearchParam('q')
const resourceId = useStringSearchParam('resource')

const events = ref<EventsRes | null>(null)

watch(search, () => {
  window.scrollTo({ top: 0 })
  fetchEvents.execute()
})

const fetchEvents = useAsyncAction(async () => {
  events.value = await $fetch<EventsRes>('events', { query: { q: search.value, resource: resourceId.value || undefined } })
})

const fetchNextEvents = useAsyncAction(async () => {
  if (!events.value?.next) return
  const newEvents = await $fetch<EventsRes>(events.value.next)
  events.value.results = events.value.results.concat(newEvents.results)
  events.value.next = newEvents.next
})
fetchEvents.execute()
</script>
