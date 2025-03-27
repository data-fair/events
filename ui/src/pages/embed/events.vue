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

    <v-expansion-panels
      v-else
      variant="accordion"
    >
      <v-expansion-panel
        v-for="(event, i) of events.results"
        :key="i"
      >
        <v-expansion-panel-title>
          <span class="mr-4">
            <owner-avatar
              v-if="event.originator?.organization && (event.sender.type !== 'organization' || event.originator.organization.id !== event.sender.id)"
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
          <template v-if="event.originator">
            <span
              v-if="event.originator.user"
              class="mr-4"
            >{{ event.originator.user.name }} ({{ event.originator.user.email || event.originator.user.id }})</span>
            <span
              v-if="event.originator?.organization && (event.sender.type !== 'organization' || event.originator.organization.id !== event.sender.id)"
              class="mr-4"
            >{{ event.originator.organization.name }} ({{ event.originator.organization.id }})</span>
          </template>
          <v-row v-if="event.body">
            <v-col cols="12">
              {{ event.body }}
            </v-col>
          </v-row>
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
import { mdiDotsVertical } from '@mdi/js'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'

type EventsRes = { results: LocalizedEvent[], next?: string }

const { t } = useI18n()
useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

const search = useStringSearchParam('q')

const events = ref<EventsRes | null>(null)

watch(search, () => {
  window.scrollTo({ top: 0 })
  fetchEvents.execute()
})

const fetchEvents = useAsyncAction(async () => {
  events.value = await $fetch<EventsRes>('events', { query: { q: search.value } })
})

const fetchNextEvents = useAsyncAction(async () => {
  if (!events.value?.next) return
  const newEvents = await $fetch<EventsRes>(events.value.next)
  events.value.results = events.value.results.concat(newEvents.results)
  events.value.next = newEvents.next
})
fetchEvents.execute()
</script>
