<template>
  <v-form
    ref="form"
    @submit="save.execute()"
  >
    <v-row>
      <v-col
        v-if="topics.length > 1"
        cols="12"
      >
        <v-select
          v-model="topicKey"
          :items="topics"
          item-title="title"
          item-value="key"
          label="Évènement"
          variant="outlined"
          density="compact"
          hide-details="auto"
          :rules="[
            (v: string) => !!v || 'Ce paramètre est requis'
          ]"
        />
      </v-col>
      <v-col cols="12">
        <v-text-field
          v-model="subscription.title"
          label="Libellé"
          variant="outlined"
          density="compact"
          hide-details="auto"
          validate-on="blur"
          :rules="[
            (v: string) => v && !!v.trim() || 'Ce paramètre est requis'
          ]"
        />
      </v-col>
      <v-col cols="12">
        <v-text-field
          v-model="subscription.url"
          label="URL"
          variant="outlined"
          density="compact"
          hide-details="auto"
          validate-on="blur"
          :rules="[
            (v: string) => v && !!v.trim() || 'Ce paramètre est requis',
            (v: string) => !!v.trim().startsWith('http://') || !!v.trim().startsWith('https://') || `Cette URL n'est pas valide`
          ]"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-text-field
          v-model="subscription.header.key"
          label="Clé de header HTTP"
          variant="outlined"
          density="compact"
          hide-details="auto"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-text-field
          v-model="subscription.header.value"
          label="Valeur de header HTTP"
          variant="outlined"
          density="compact"
          hide-details="auto"
        />
      </v-col>
    </v-row>
    <div class="d-flex flex-wrap justify-end ga-2 mt-4">
      <v-btn
        :append-icon="mdiSend"
        :loading="test.loading.value"
        color="primary"
        variant="text"
        @click="test.execute()"
      >
        Tester
      </v-btn>
      <confirm-menu
        v-if="modelValue._id"
        @confirm="remove.execute()"
      />
      <v-btn
        color="primary"
        variant="flat"
        :loading="save.loading.value"
        :disabled="!changed || save.loading.value"
        @click="save.execute()"
      >
        {{ modelValue._id ? 'Enregistrer' : 'Ajouter' }}
      </v-btn>
    </div>
    <v-alert
      v-if="testResult"
      :type="testResult.ok ? 'success' : 'error'"
      variant="outlined"
      density="compact"
      class="mt-4"
    >
      {{ testResult.message }}
    </v-alert>
  </v-form>
</template>

<script lang="ts" setup>
import type { VForm } from 'vuetify/components'
import type { WebhookSubscription } from '#api/types'

const modelValue = defineModel<Partial<WebhookSubscription> & Required<Pick<WebhookSubscription, 'sender'>>>({ required: true })
const { topics } = defineProps<{ topics: { key: string, title: string }[] }>()
const emit = defineEmits<{ saved: [], deleted: [] }>()

const form = ref<VForm | null>(null)

// only the properties accepted by the POST route, the listed subscriptions also carry
// created, updated, owner and visibility that the API refuses or sets itself
const editable = (s: typeof modelValue.value) => ({
  _id: s._id,
  topic: s.topic,
  sender: s.sender,
  title: s.title ?? '',
  url: s.url ?? '',
  header: { key: s.header?.key ?? '', value: s.header?.value ?? '' }
})

const subscription = reactive(editable(modelValue.value))
watch(modelValue, () => { Object.assign(subscription, editable(modelValue.value)) })

const changed = computed(() => JSON.stringify(subscription) !== JSON.stringify(editable(modelValue.value)))

const topicKey = computed({
  get: () => subscription.topic?.key,
  set: (key) => { subscription.topic = topics.find(topic => topic.key === key) }
})

const save = useAsyncAction(async () => {
  const valid = (await form.value?.validate())?.valid
  if (!valid) return
  await $fetch<WebhookSubscription>('webhook-subscriptions', { method: 'POST', body: subscription })
  emit('saved')
})

// a saved and unchanged webhook is tested through the delivery queue, its result arrives in the history below;
// otherwise the values of the form are tested at once and the result shows here
const testResult = ref<{ ok: boolean, message: string }>()
watch(subscription, () => { testResult.value = undefined })
const test = useAsyncAction(async () => {
  testResult.value = undefined
  if (subscription._id && !changed.value) {
    await $fetch(`webhook-subscriptions/${subscription._id}/_test`, { method: 'POST' })
    return
  }
  const valid = (await form.value?.validate())?.valid
  if (!valid) return
  const { status, error } = await $fetch<{ status?: number, error?: string }>('webhook-subscriptions/_test', { method: 'POST', body: subscription })
  if (status && status < 400) testResult.value = { ok: true, message: `Le message de test a été reçu (réponse HTTP ${status}).` }
  else testResult.value = { ok: false, message: status ? `L'URL a répondu par une erreur HTTP ${status}.` : `L'envoi a échoué : ${error}` }
})

const remove = useAsyncAction(async () => {
  await $fetch('webhook-subscriptions/' + subscription._id, { method: 'DELETE' })
  emit('deleted')
})
</script>

<style>

</style>
