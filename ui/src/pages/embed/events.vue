<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-row v-if="events">
      <v-col
        v-for="(event, i) of events.results"
        :key="`notification_${i}`"
        class="pt-0 pb-2"
        cols="12"
      >
        <v-hover
          v-slot="{ isHovering }"
        >
          <v-card
            :elevation="isHovering ? 2 : 0"
            height="100%"
            rounded
            target="_blank"
            border
          >
            <v-card-text class="d-flex justify-space-between pt-1 pb-1">
              <div class="d-flex align-center">
                <v-avatar
                  size="40"
                  class="mr-3 mt-1"
                >
                  <img
                    v-if="event.icon && event.icon.toString().trim().startsWith('http')"
                    :src="event.icon"
                    alt="icon"
                  >
                  <v-icon v-else :icon="mdiBell" />
                </v-avatar>
                <div class="d-flex align-center flex-column">
                  <div
                    class="text-black text-subtitle-1"
                    style="align-self: start;"
                  >
                    {{ event.title }}
                  </div>
                  <div
                    v-if="event.body"
                    style="align-self: start;"
                  >
                    {{ event.body }}
                  </div>
                </div>
              </div>
              <div
                class="d-flex align-center justify-end"
                style="flex-shrink: 0;"
              >
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span v-bind="props">{{ dayjs(event.date).fromNow() }}</span>
                  </template>
                  <span>{{ dayjs(event.date).format('LLL') }}</span>
                </v-tooltip>
              </div>
            </v-card-text>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>
    <div
      v-if="events && events.next"
      class="mt-3"
    >
      <v-btn
        variant="flat"
        block
        @click="fetchNextEvents"
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

type EventsRes = { results: LocalizedEvent[], next?: string }

const { t } = useI18n()
useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

const events = ref<EventsRes | null>(null)

const fetchEvents = withUiNotif(async () => {
  events.value = await $fetch<EventsRes>('events')
})

const fetchNextEvents = withUiNotif(async () => {
  if (!events.value?.next) return
  const newEvents = await $fetch<EventsRes>(events.value.next)
  events.value.results = events.value.results.concat(newEvents.results)
  events.value.next = newEvents.next
})
fetchEvents()
</script>
