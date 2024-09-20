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
      {{ t('logged') }}
    </v-alert>
    <v-alert
      v-else-if="session.state.accountRole !== 'admin'"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      {{ t('admin') }}
    </v-alert>
    <template v-else>
      <template
        v-for="topic in topics"
        :key="topic.key"
      >
        <v-row>
          <v-col>
            <div
              class="text-subtitle2"
              style="height: auto;"
            >
              {{ t('webhooks', topic) }}
            </div>
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

<script lang="ts" setup>
const keys = useStringsArraySearchParam('key')
const titles = useStringsArraySearchParam('title')
const topics = computed(() => keys.value.map((key, i) => ({ key, title: titles.value[i] })))

const session = useSession()
const route = useRoute()
const { t } = useI18n()

const sender = computed(() => {
  if (typeof route.query.sender !== 'string') return
  const sender = parseSender(route.query.sender)
  if (sender === 'none') return
  return sender
})
</script>

<style lang="css" scoped>
</style>
