<template>
  <!-- the bell of lib-vuetify-events shows the last 10, this page all of them -->
  <v-container data-iframe-height>
    <v-progress-linear
      v-if="!notifications"
      indeterminate
      color="primary"
    />
    <layout-empty-state
      v-else-if="!notifications.length"
      :icon="mdiBellOutline"
      :no-data-text="t('noNotifications')"
    />
    <template v-else>
      <div class="text-title-medium mb-4">
        {{ t('notifications', { count }, count) }}<span
          v-if="countNew"
          class="text-warning"
        > · {{ t('new', { count: countNew }, countNew) }}</span>
      </div>
      <!-- no role="list": its items are links, as in the bell -->
      <v-list
        class="py-0 border-sm rounded"
        :role="undefined"
      >
        <template
          v-for="(notification, i) of notifications"
          :key="notification._id"
        >
          <!-- between two tinted new items, the default divider is lighter than them and disappears -->
          <v-divider
            v-if="i > 0"
            :color="i < countNew ? 'warning' : undefined"
            :opacity="i < countNew ? 0.4 : undefined"
          />
          <v-list-item
            :href="notification.url"
            :value="notification.url ? notification._id : undefined"
            :active="i < countNew"
            lines="two"
            active-class="text-warning"
            target="_blank"
          >
            <v-list-item-title class="text-wrap">
              {{ notification.title }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ dayjs(notification.date).format('lll') }}
            </v-list-item-subtitle>
            <!-- outside the subtitle: its line clamp would hide the body of a two-line item -->
            <div
              v-if="notification.body"
              class="text-body-medium text-medium-emphasis"
            >
              {{ notification.body }}
            </div>
            <template #append>
              <template v-if="i < countNew">
                <v-badge
                  color="warning"
                  class="mr-3"
                  dot
                  inline
                />
                <span class="d-sr-only">{{ t('newNotification') }}</span>
              </template>
              <owner-avatar
                v-if="notification.sender"
                :owner="avatarOwner(notification.sender)"
              />
            </template>
          </v-list-item>
        </template>
      </v-list>
      <v-btn
        v-if="notifications.length < count"
        :loading="fetchMore.loading.value"
        variant="text"
        color="primary"
        class="mt-2"
        block
        @click="fetchMore.execute()"
      >
        {{ t('seeMore') }}
      </v-btn>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifications: "Aucune notification | {count} notification | {count} notifications"
  new: "{count} nouvelle | {count} nouvelle | {count} nouvelles"
  newNotification: Nouvelle notification
  noNotifications: Vous n'avez pas encore reçu de notification.
  seeMore: Voir plus
en:
  notifications: "No notification | {count} notification | {count} notifications"
  new: "{count} new | {count} new | {count} new"
  newNotification: New notification
  noNotifications: You have not received any notifications yet.
  seeMore: See more
</i18n>

<script lang="ts" setup>
import type { Notification } from '#api/types'
import { mdiBellOutline } from '@mdi/js'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'
import LayoutEmptyState from '@data-fair/lib-vuetify/layout-empty-state.vue'

type NotificationsRes = { results: Notification[], count: number, countNew: number }

const size = 20

const { t } = useI18n()
const session = useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

const notifications = ref<Notification[] | null>(null)
const count = ref(0)
// each listing moves the read pointer of the user: only the first one tells which ones are new,
// and as the list is sorted by date they are the first countNew ones
const countNew = ref(0)

const fetchFirst = useAsyncAction(async () => {
  const res = await $fetch<NotificationsRes>('notifications', { query: { size } })
  notifications.value = res.results
  count.value = res.count
  countNew.value = res.countNew
})
fetchFirst.execute()

const fetchMore = useAsyncAction(async () => {
  if (!notifications.value) return
  const res = await $fetch<NotificationsRes>('notifications', { query: { size, skip: notifications.value.length, count: 'false' } })
  notifications.value = notifications.value.concat(res.results)
})

useWS($apiPath + '/')?.subscribe<Notification>(`user:${session.state.user.id}:notifications`, (notification) => {
  if (!notifications.value) return
  notifications.value.unshift(notification)
  count.value += 1
  countNew.value += 1
})
</script>
