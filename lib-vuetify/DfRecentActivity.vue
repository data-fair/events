<template>
  <v-progress-linear
    v-if="!events"
    :active="eventsFetch.loading.value"
    indeterminate
    color="primary"
  />
  <p
    v-else-if="!events.length"
    class="text-body-medium text-medium-emphasis"
  >
    {{ t('noEvents') }}
  </p>
  <!-- the line is cut above the most recent event and goes on under the last one: older events exist,
       the host links to the traceability page that lists them -->
  <v-timeline
    v-else
    density="compact"
    side="end"
    truncate-line="start"
  >
    <v-timeline-item
      v-for="event in events"
      :key="event._id"
      dot-color="surface"
      size="small"
      fill-dot
    >
      <!-- the icons of the traceability list of events -->
      <template #icon>
        <v-avatar
          v-if="event.originator?.user?.admin"
          :icon="mdiShieldAlert"
          :size="28"
          color="admin"
        />
        <v-avatar
          v-else-if="event.originator?.internalProcess"
          :icon="mdiCogRefresh"
          :size="28"
          color="primary"
        />
        <v-avatar
          v-else-if="event.originator?.apiKey"
          :icon="mdiApi"
          :size="28"
          color="primary"
        />
        <owner-avatar
          v-else-if="otherOrganization(event)"
          :owner="{ type: 'organization', id: '', ...event.originator!.organization! }"
        />
        <owner-avatar
          v-else-if="event.originator?.user"
          :owner="{ type: 'user', id: '', ...event.originator.user }"
        />
        <v-avatar
          v-else
          :icon="mdiHistory"
          :size="28"
          color="primary"
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
</template>

<script setup lang="ts">
import type { Event } from '@data-fair/lib-common-types/event/index.js'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiApi, mdiCogRefresh, mdiHistory, mdiShieldAlert } from '@mdi/js'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'
import useFetch from '@data-fair/lib-vue/fetch.js'
import useLocaleDayjs from '@data-fair/lib-vue/locale-dayjs.js'

// the API localizes the title of the events it lists
type LocalizedEvent = Omit<Event, 'title' | 'body' | 'htmlBody'> & { _id: string, title: string }

const { eventsUrl } = defineProps<{ eventsUrl: string }>()

const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

// the events of the active account, an admin only API: the host shows this block to its admins
const eventsFetch = useFetch<{ results: LocalizedEvent[] }>(`${eventsUrl}/api/events`, { query: { size: 5 } })
const events = computed(() => eventsFetch.data.value?.results)

// an organization different from the sender: a partner, or a user acting from another account
const otherOrganization = (event: LocalizedEvent) => {
  const organization = event.originator?.organization
  return !!organization && (event.sender?.type !== 'organization' || organization.id !== event.sender.id)
}

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
    admin: Administrator

  fr:
    noEvents: Aucune activité récente.
    admin: Administrateur
</i18n>
