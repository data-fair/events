<template>
  <!-- every subscription of the user, wherever it was made: a recap to tune or remove them, not to subscribe -->
  <v-container data-iframe-height>
    <p class="text-body-medium mb-4">
      {{ t('intro') }}
    </p>
    <v-progress-linear
      v-if="!subscriptions"
      indeterminate
      color="primary"
    />
    <template v-else>
      <div class="d-flex align-center flex-wrap ga-2 mb-4">
        <span
          v-if="subscriptions.length"
          class="text-title-medium"
        >{{ t('subscriptions', { count }, count) }}</span>
        <v-spacer />
        <v-btn
          :prepend-icon="mdiBell"
          to="/notifications"
          variant="text"
          color="primary"
          size="small"
        >
          {{ t('seeNotifications') }}
        </v-btn>
      </div>
      <layout-empty-state
        v-if="!subscriptions.length"
        :icon="mdiRss"
        :no-data-text="t('noSubscriptions')"
      />
      <v-list
        v-else
        class="py-0 border-sm rounded"
      >
        <template
          v-for="(subscription, i) of subscriptions"
          :key="subscription._id"
        >
          <v-divider v-if="i > 0" />
          <v-list-item lines="two">
            <template #prepend>
              <owner-avatar
                v-if="subscription.sender"
                :owner="avatarOwner(subscription.sender)"
              />
              <v-avatar
                v-else
                :icon="mdiRss"
                :size="28"
              />
            </template>
            <v-list-item-title class="text-wrap">
              {{ localized(subscription.title) || subscription.topic.title }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ details(subscription) }}
            </v-list-item-subtitle>
            <v-chip-group
              :model-value="subscription.outputs"
              :aria-label="t('outputs')"
              multiple
              @update:model-value="(outputs: Subscription['outputs']) => saveOutputs.execute(subscription, outputs)"
            >
              <v-chip
                v-for="output of ['devices', 'email'] as const"
                :key="output"
                :value="output"
                :prepend-icon="output === 'email' ? mdiEmail : mdiCellphone"
                size="small"
                variant="outlined"
                color="primary"
                filter
              >
                {{ t(output) }}
              </v-chip>
            </v-chip-group>
            <template #append>
              <v-menu
                :close-on-content-click="false"
                max-width="500"
                location="left"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    :icon="mdiDelete"
                    :title="t('unsubscribe')"
                    :aria-label="t('unsubscribe')"
                    variant="text"
                    color="warning"
                    size="small"
                  />
                </template>
                <template #default="{ isActive }">
                  <v-card :title="t('unsubscribe')">
                    <v-card-text>
                      {{ t('unsubscribeText') }}
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer />
                      <v-btn
                        variant="text"
                        @click="isActive.value = false"
                      >
                        {{ t('cancel') }}
                      </v-btn>
                      <v-btn
                        :loading="unsubscribe.loading.value"
                        color="warning"
                        variant="flat"
                        @click="unsubscribe.execute(subscription)"
                      >
                        {{ t('unsubscribe') }}
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </template>
              </v-menu>
            </template>
          </v-list-item>
        </template>
      </v-list>
      <v-btn
        v-if="subscriptions.length < count"
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
  intro: Tous vos abonnements, où que vous les ayez faits. Leurs notifications arrivent dans la cloche ; choisissez ici si vous les recevez aussi par e-mail ou sur vos appareils.
  subscriptions: "Aucun abonnement | {count} abonnement | {count} abonnements"
  noSubscriptions: Vous n'êtes abonné à aucune notification.
  outputs: Recevoir aussi
  email: Par e-mail
  devices: Sur mes appareils
  allDepartments: tous les départements
  subscribedOn: "abonné sur {host}"
  unsubscribe: Se désabonner
  unsubscribeText: Vous ne recevrez plus ces notifications. Pour vous réabonner, il faudra retourner sur la page où vous vous étiez abonné, cette liste ne le permet pas.
  cancel: Annuler
  seeMore: Voir plus
  seeNotifications: Voir mes notifications
en:
  intro: All your subscriptions, wherever you made them. Their notifications arrive in the bell; choose here whether you also receive them by email or on your devices.
  subscriptions: "No subscription | {count} subscription | {count} subscriptions"
  noSubscriptions: You are not subscribed to any notification.
  outputs: Also receive
  email: By email
  devices: On my devices
  allDepartments: all departments
  subscribedOn: "subscribed on {host}"
  unsubscribe: Unsubscribe
  unsubscribeText: You will no longer receive these notifications. To subscribe again, you will have to go back to the page where you subscribed, this list does not allow it.
  cancel: Cancel
  seeMore: See more
  seeNotifications: See my notifications
</i18n>

<script lang="ts" setup>
import type { Subscription } from '#api/types'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'
import LayoutEmptyState from '@data-fair/lib-vuetify/layout-empty-state.vue'

type SubscriptionsRes = { results: Subscription[], count: number }

const size = 20

const { t, locale } = useI18n()
const session = useSessionAuthenticated()

const subscriptions = ref<Subscription[] | null>(null)
const count = ref(0)
const query = (skip: number) => ({ recipient: session.state.user.id, sort: 'created.date:-1', size, skip })

const fetchFirst = useAsyncAction(async () => {
  const res = await $fetch<SubscriptionsRes>('subscriptions', { query: query(0) })
  subscriptions.value = res.results
  count.value = res.count
})
fetchFirst.execute()

const fetchMore = useAsyncAction(async () => {
  if (!subscriptions.value) return
  const res = await $fetch<SubscriptionsRes>('subscriptions', { query: query(subscriptions.value.length) })
  subscriptions.value = subscriptions.value.concat(res.results)
})

// subscriptions imported from the former notify service can have localized titles
const localized = (value: string | Record<string, string> | undefined) => {
  if (typeof value !== 'object') return value
  return value[locale.value] ?? value.fr ?? value.en
}

const details = (subscription: Subscription) => {
  const parts = [subscription.topic.title]
  const sender = subscription.sender
  if (sender) {
    // the subscribe page only knows the id of the sender it receives in its query
    const name = sender.name || sender.id
    const department = sender.department === '*' ? t('allDepartments') : (sender.departmentName ?? sender.department)
    parts.push(department ? `${name} (${department})` : name)
  }
  // the links of its notifications point to this site: worth knowing when it is not this one
  if (subscription.origin && new URL(subscription.origin).origin !== window.location.origin) {
    parts.push(t('subscribedOn', { host: new URL(subscription.origin).host }))
  }
  return parts.filter(Boolean).join(' · ')
}

const saveOutputs = useAsyncAction(async (subscription: Subscription, outputs: Subscription['outputs']) => {
  const saved = await $fetch<Subscription>('subscriptions', { method: 'POST', body: { ...subscription, outputs } })
  subscription.outputs = saved.outputs
})

const unsubscribe = useAsyncAction(async (subscription: Subscription) => {
  await $fetch('subscriptions/' + subscription._id, { method: 'DELETE' })
  subscriptions.value = subscriptions.value?.filter(s => s._id !== subscription._id) ?? null
  count.value -= 1
})
</script>
