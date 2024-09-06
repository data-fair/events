<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-alert
      v-if="!session.state.user"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      {{ $t('logged') }}
    </v-alert>
    <v-alert
      v-else-if="session.state.accountRole !== 'admin'"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      {{ $t('admin') }}
    </v-alert>
    <template v-else>
      <template
        v-for="topic in topics"
        :key="topic.key"
      >
        <v-row>
          <v-col>
            <v-subheader
              class="px-0"
              style="height: auto;"
            >
              {{ $t('webhooks', topic) }}
            </v-subheader>
          </v-col>
        </v-row>
        <v-row
          class="ma-0"
        >
          <subscribe-webhook
            :topic="topic"
            :no-sender="!!$route.query.noSender"
            :sender="sender"
          />
        </v-row>
      </template>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  logged: Vous devez être connecté pour pouvoir configurer des Webhooks.
  admin: Vous devez être administrateur pour pouvoir configurer des Webhooks.
  webhooks: "Configurer des Webhooks pour l'évènement {title}"
</i18n>

<script setup>
import { computed } from 'vue'
import { useSession } from '@data-fair/lib/vue/session.js'
import { parseSender } from '~/utils/sender-utils'

const session = useSession()
const route = useRoute()

const topics = computed(() => {
  if (typeof route.query.key !== 'string') throw new Error('query.key is required')
  if (typeof route.query.title !== 'string') throw new Error('query.title is required')
  const keys = route.query.key.split(',')
  const titles = route.query.title.split(',')
  return keys.map((key, i) => ({ key, title: titles[i] }))
})

const sender = computed(() => {
  if (typeof route.query.sender !== 'string') return null
  return parseSender(route.query.sender)
})
</script>

<style lang="css" scoped>
</style>
