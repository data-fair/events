<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-alert
      v-if="!user"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      Vous devez être connecté pour pouvoir recevoir des notifications.
    </v-alert>
    <template v-else>
      <v-row v-if="register && $route.query.register !== 'false' && registrations && !loading">
        <register-device
          :registrations="registrations"
          @register="refresh"
        />
      </v-row>
      <v-row v-if="header">
        <v-col>
          <v-subheader
            class="px-0"
            style="height: auto;"
          >
            {{ header }}
          </v-subheader>
        </v-col>
      </v-row>
      <v-row
        v-for="(topic, i) in topics"
        :key="topic.key"
        class="ma-0"
      >
        <subscribe
          v-if="outputs"
          :topic="topic"
          :no-sender="!!$route.query.noSender"
          :icon="$route.query.icon"
          :url-template="$route.query['url-template']"
          :outputs="outputs"
          :sender="senders[i] || null"
          @register="register = true"
        />
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifyMe: "Paramètre manquant | Me notifier de cet évènement : | Me notifier de ces évènements :"
en:
  notifyMe: "Missing parameter | Send me notifications for this event : | Send me notifications for these events :"
</i18n>

<script setup lang="ts">
const reactiveSearchParams = useReactiveSearchParams()
const querySenders = useStringsArraySearchParam('sender')
const keys = useStringsArraySearchParam('key')
const titles = useStringsArraySearchParam('title')

const topics = computed(() => keys.value.map((key, i) => ({ key, title: titles.value[i] })))
const senders = computed(() => querySenders.value.filter(Boolean).map(parseSender))
const header = computed(() => {
  if (reactiveSearchParams.header === 'no') return ''
  return reactiveSearchParams.header || $tc('notifyMe', topics.value.length)
})

const session = useSession()

const register = ref(false)
const loading = ref(false)
const registrations = ref<object | null>(null)

/*
export default {
  layout: 'embed',
  data() {
    return {
      register: false,
      loading: null,
      registrations: null,
      outputs: null
    }
  },
  computed: {
    ...mapState('session', ['user']),
    topics() {
      const keys = reactiveSearchParams.key.split(',')
      const titles = reactiveSearchParams.title.split(',')
      return keys.map((key, i) => ({ key, title: titles[i] }))
    },
    senders() {
      return reactiveSearchParams.sender ? reactiveSearchParams.sender.split(',').map(s => s ? parseSender(s) : null) : []
    },
    header() {
      if (reactiveSearchParams.header === 'no') return ''
      return reactiveSearchParams.header || this.$tc('notifyMe', this.topics.length)
    }
  },
  mounted() {
    this.refresh()
  },
  methods: {
    async refresh() {
      if (reactiveSearchParams.outputs !== 'auto') this.outputs = ['devices', 'email']
      this.loading = true
      this.registrations = await this.$axios.$get('api/v1/push/registrations')
      if (reactiveSearchParams.outputs === 'auto') {
        const outputs = ['email']
        if (this.registrations.find(r => !r.disabled)) outputs.push('devices')
        this.outputs = outputs
      }
      this.loading = false
    }
  }
} */
</script>

<style lang="css" scoped>
</style>
