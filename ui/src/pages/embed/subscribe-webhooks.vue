<template>
  <v-container
    fluid
    data-iframe-height
    class="bg-surface"
  >
    <v-alert
      v-if="!session.state.user"
      type="error"
      class="my-1"
    >
      {{ t('logged') }}
    </v-alert>
    <v-alert
      v-else-if="session.state.accountRole !== 'admin'"
      type="error"
      class="my-1"
    >
      {{ t('admin') }}
    </v-alert>
    <subscribe-webhook
      v-else
      :topics="topics"
      :no-sender="!!$route.query.noSender"
      :sender="sender"
    />
  </v-container>
</template>

<i18n lang="yaml">
fr:
  logged: Vous devez être connecté pour pouvoir configurer des Webhooks.
  admin: Vous devez être administrateur pour pouvoir configurer des Webhooks.
en:
  logged: You must be logged in to configure webhooks.
  admin: You must be an administrator to configure webhooks.
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
