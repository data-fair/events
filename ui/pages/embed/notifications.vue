<template>
  <v-container
    fluid
    data-iframe-height
  >
    <div class="text-h6 mb-5">
      <v-icon class="mt-n1 mr-1">
        mdi-bell
      </v-icon><span>{{ t('notifications', { nb: notifications ? notifications.count : 0 }, { plural: notifications ? notifications.count : 0 }) }}</span>
    </div>
    <v-row v-if="notifications">
      <v-col
        v-for="(notification, i) of notifications.results"
        :key="`notification_${i}`"
        class="pt-0 pb-2"
        cols="12"
      >
        <v-hover
          v-slot="{ hover }"
        >
          <v-card
            :elevation="hover ? 2 : 0"
            height="100%"
            rounded
            :href="notification && notification.url"
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
                    v-if="notification.icon && notification.icon.toString().trim().startsWith('http')"
                    :src="notification.icon"
                    alt="icon"
                  >
                  <v-icon v-else>
                    mdi-bell
                  </v-icon>
                </v-avatar>
                <div class="d-flex align-center flex-column">
                  <div
                    class="text-black text-subtitle-1"
                    style="align-self: start;"
                  >
                    {{ notification.title }}
                  </div>
                  <div
                    v-if="notification.body"
                    style="align-self: start;"
                  >
                    {{ notification.body }}
                  </div>
                </div>
              </div>
              <div
                class="d-flex align-center justify-end"
                style="flex-shrink: 0;"
              >
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span v-bind="props">{{ dayjs(notification.date).fromNow() }}</span>
                  </template>
                  <span>{{ dayjs(notification.date).format('LLL') }}</span>
                </v-tooltip>
              </div>
            </v-card-text>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>
    <div
      v-if="notifications && notifications.count && notifications.results.length < notifications.count"
      class="mt-3"
    >
      <v-btn
        variant="flat"
        block
        @click="fetchNotifications(true)"
      >
        {{ t('seeMore') }}
      </v-btn>
    </div>
    <!--    <pre style="font-size: 10px;">{{ notifications }}</pre> -->
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifications: "Aucune notification | {nb} notifications"
  seeMore: "Voir plus"
en:
  notifications: "No notification | {nb} notifications"
  seeMore: "See more"
</i18n>

<script lang="ts" setup>
import type { Notification } from '#api/types'

type NotificationsRes = { results: Notification[], count: number }

const { t } = useI18n()
const session = useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

useWS('/events/api/')?.subscribe<Notification>(`user:${session.state.user.id}:notifications`, () => {
  fetchNotifications()
})

const page = ref(0)
const size = 10
const notifications = ref<NotificationsRes | null>(null)

const fetchNotifications = withFatalError(async (next?: boolean) => {
  if (next) page.value += 1
  else page.value = 0
  const newNotifications = await $fetch<NotificationsRes>('/events/api/v1/notifications', { params: { skip: page.value * size, size } })
  if (next && notifications.value) {
    notifications.value.results = notifications.value.results.concat(newNotifications.results)
  } else {
    notifications.value = newNotifications
  }
})
fetchNotifications()
</script>
