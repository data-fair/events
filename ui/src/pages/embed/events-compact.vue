<template>
  <!-- the last events of the account in a card of a host (data-fair dashboard): the host holds the title and the
       link to the traceability page, the iframe grows with its content -->
  <div data-iframe-height>
    <p
      v-if="eventsFetch.error.value"
      class="text-body-medium text-medium-emphasis"
    >
      {{ t('loadError') }}
    </p>
    <p
      v-else-if="events && !events.length"
      class="text-body-medium text-medium-emphasis"
    >
      {{ t('noEvents') }}
    </p>
    <!-- the line is cut above the most recent event and goes on under the last one: older events exist -->
    <v-timeline
      v-else
      density="compact"
      side="end"
      truncate-line="start"
    >
      <!-- same lines as the events: the iframe announces its final height from the first render -->
      <template v-if="!events">
        <v-timeline-item
          v-for="i in size"
          :key="i"
          dot-color="surface-light"
          size="small"
          fill-dot
        >
          <v-skeleton-loader
            class="mx-n4 my-n1"
            type="text@2"
            width="80vw"
          />
        </v-timeline-item>
      </template>
      <v-timeline-item
        v-for="event in events"
        :key="event._id"
        dot-color="surface"
        size="small"
        fill-dot
      >
        <!-- the icons of the traceability list of events -->
        <template #icon>
          <event-originator-avatar
            :event="event"
            fallback-color="primary"
          />
        </template>
        <div class="text-body-medium">
          {{ event.title || event.topic.title }}
        </div>
        <div class="text-body-small text-medium-emphasis">
          <template v-if="originatorName(event)">
            {{ originatorName(event) }} ·
          </template>
          {{ dayjs(event.date).fromNow() }}
        </div>
      </v-timeline-item>
    </v-timeline>
  </div>
</template>

<script setup lang="ts">
import type { LocalizedEvent } from '#api/types'
import EventOriginatorAvatar from '@data-fair/lib-vuetify-events/EventOriginatorAvatar.vue'

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

// the events of the active account, an admin only API: the host shows this page to its admins
const size = 5
const eventsFetch = useFetch<{ results: LocalizedEvent[] }>(`${$apiPath}/events`, { query: { size } })
const events = computed(() => eventsFetch.data.value?.results)

// the API hides the name of a platform admin from the other users
const originatorName = (event: LocalizedEvent) => {
  const originator = event.originator
  if (originator?.user) return originator.user.name || (originator.user.admin ? t('admin') : '')
  return originator?.apiKey?.title || originator?.internalProcess?.title
}
</script>

<i18n lang="yaml">
  en:
    noEvents: No recent activity.
    loadError: The recent activity could not be loaded.
    admin: Administrator

  fr:
    noEvents: Aucune activité récente.
    loadError: L'activité récente n'a pas pu être chargée.
    admin: Administrateur
</i18n>
