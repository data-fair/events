<template>
  <!-- the bell of lib-vuetify-events shows the last 10, this page all of them -->
  <v-container data-iframe-height>
    <v-progress-linear
      v-if="!notifications"
      indeterminate
      color="primary"
    />
    <template v-else>
      <div class="d-flex align-center flex-wrap ga-2 mb-4">
        <span
          v-if="notifications.length"
          class="text-title-medium"
        >
          {{ t('notifications', { count }, count) }}<span
            v-if="countNew"
            class="text-warning"
          > · {{ t('new', { count: countNew }, countNew) }}</span>
        </span>
        <v-spacer />
        <v-btn
          :prepend-icon="mdiRss"
          to="/subscriptions"
          variant="text"
          color="primary"
          size="small"
        >
          {{ t('manageSubscriptions') }}
        </v-btn>
      </div>
      <layout-empty-state
        v-if="!notifications.length"
        :icon="mdiBellOutline"
        :no-data-text="t('noNotifications')"
      />
      <!-- no role="list": its items are links, as in the bell -->
      <v-list
        v-else
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
              <!-- its label is what a screen reader says, as the badge of the bell (default: "Badge") -->
              <v-badge
                v-if="i < countNew"
                :label="t('newNotification')"
                color="warning"
                class="mr-3"
                dot
                inline
              />
              <owner-avatar
                v-if="notification.sender"
                :owner="avatarOwner(notification.sender)"
              />
            </template>
          </v-list-item>
        </template>
      </v-list>
      <load-more-btn
        v-if="notifications.length < count"
        :loading="more.loading.value"
        @click="more.execute()"
      />
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifications: "Aucune notification | {count} notification | {count} notifications"
  new: "{count} nouvelle | {count} nouvelle | {count} nouvelles"
  newNotification: Nouvelle notification
  noNotifications: Vous n'avez pas encore reçu de notification.
  manageSubscriptions: Gérer mes abonnements
en:
  notifications: "No notification | {count} notification | {count} notifications"
  new: "{count} new | {count} new | {count} new"
  newNotification: New notification
  noNotifications: You have not received any notifications yet.
  manageSubscriptions: Manage my subscriptions
</i18n>

<script lang="ts" setup>
import type { Notification } from '#api/types'
import { mdiBellOutline } from '@mdi/js'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'
import LayoutEmptyState from '@data-fair/lib-vuetify/layout-empty-state.vue'

type NotificationsRes = { results: Notification[], count: number, countNew: number }

const { t } = useI18n()
const session = useSessionAuthenticated()
const { dayjs } = useLocaleDayjs()

const { items: notifications, count, first, more } = useLoadMore<Notification, NotificationsRes>('notifications', () => ({}))
// each listing moves the read pointer of the user: only the first one tells which ones are new,
// and as the list is sorted by date they are the first countNew ones
const countNew = ref(0)
watch(first, (res) => { countNew.value = res?.countNew ?? 0 })

useWS($apiPath + '/')?.subscribe<Notification>(`user:${session.state.user.id}:notifications`, (notification) => {
  if (!notifications.value) return
  notifications.value.unshift(notification)
  count.value += 1
  countNew.value += 1
})
</script>
