<template>
  <v-container
    fluid
    data-iframe-height
  >
    <div class="text-h6 mb-5">
      <v-icon
        class="mt-n1 mr-1"
        :icon="mdiRssBox"
      />
      <span v-if="recipientSubscriptions">
        {{ t('subscriptions', { nb: recipientSubscriptions.count }, { plural: recipientSubscriptions.count }) }}
      </span>
    </div>
    <v-row v-if="recipientSubscriptions">
      <v-col
        v-for="(subscription, i) of recipientSubscriptions.results"
        :key="`subscription_${i}`"
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
            border
          >
            <v-card-text class="d-flex justify-space-between pt-1 pb-1">
              <div class="d-flex align-center">
                <v-avatar
                  size="40"
                  class="mr-3 mt-1"
                >
                  <img
                    v-if="subscription.icon && subscription.icon.length && subscription.icon.toString().trim().startsWith('http')"
                    :src="subscription.icon"
                    alt="icon"
                  >
                  <v-icon
                    v-else
                    :icon="mdiRss"
                  />
                </v-avatar>
                <div class="d-flex align-center flex-column">
                  <div
                    class="text-black text-subtitle-1"
                    style="align-self: start;"
                  >
                    {{ typeof subscription.title === 'object' ? subscription.title[$i18n.locale] || subscription.title['en'] || subscription.title['fr'] : subscription.title }}
                  </div>
                  <div
                    v-if="subscription.topic"
                    style="align-self: start;"
                  >
                    {{ subscription.topic.title }}
                  </div>
                  <div
                    v-if="subscription.outputs && subscription.outputs.length"
                    style="align-self: start;"
                  >
                    <v-icon
                      v-if="subscription.outputs.includes('email')"
                      :icon="mdiEmail"
                    />
                    <v-icon
                      v-if="subscription.outputs.includes('devices')"
                      :icon="mdiDevices"
                    />
                  </div>
                </div>
              </div>
              <div
                class="d-flex align-center justify-end"
                style="flex-shrink: 0;"
              >
                <v-tooltip
                  v-if="subscription.updated"
                  location="top"
                >
                  <template #activator="{ props }">
                    <span v-bind="props">{{ dayjs(subscription.updated.date).fromNow() }}</span>
                  </template>
                  <span>{{ dayjs(subscription.updated.date).format('LLLL') }}</span>
                </v-tooltip>
                <v-btn
                  class="ml-4"
                  color="error"
                  icon
                  size="small"
                  @click="unsubscribe(subscription)"
                >
                  <v-icon :icon="mdiDelete" />
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  subscriptions: "Aucune souscription | {nb} souscription | {nb} souscriptions"
en:
  subscriptions: "No subscription | {nb} subscription | {nb} subscriptions"
</i18n>

<script lang="ts" setup>
import type { Subscription } from '#api/types'
import { mdiRssBox } from '@mdi/js'

const session = useSessionAuthenticated()
const { t } = useI18n()
const { dayjs } = useLocaleDayjs()

const fetchSubscriptions = await useFetch<{ results: Subscription[], count: number }>($apiPath + '/subscriptions', { query: { recipient: session.state.user.id } })

const recipientSubscriptions = computed(() => fetchSubscriptions.data.value)

const unsubscribe = withUiNotif(async (subscription: Subscription) => {
  await $fetch('subscriptions/' + subscription._id, { method: 'DELETE' })
  fetchSubscriptions.refresh()
})
</script>
