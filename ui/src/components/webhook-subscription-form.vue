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
          :label="t('topic')"
          variant="outlined"
          density="compact"
          hide-details="auto"
          :rules="[
            (v: string) => !!v || t('required')
          ]"
        />
      </v-col>
      <v-col cols="12">
        <v-text-field
          v-model="subscription.title"
          :label="t('title')"
          variant="outlined"
          density="compact"
          hide-details="auto"
          validate-on="blur"
          :rules="[
            (v: string) => v && !!v.trim() || t('required')
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
            (v: string) => v && !!v.trim() || t('required'),
            (v: string) => !!v.trim().startsWith('http://') || !!v.trim().startsWith('https://') || t('invalidUrl')
          ]"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-text-field
          v-model="subscription.header.key"
          :label="t('headerKey')"
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
          :label="t('headerValue')"
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
        {{ t('test') }}
      </v-btn>
      <!-- min-height: an iframe sized to its content grows to show the menu, as for the removal of a device -->
      <v-menu
        v-if="modelValue._id"
        :close-on-content-click="false"
        max-width="500"
        min-height="180"
        location="bottom end"
      >
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            color="warning"
            variant="flat"
          >
            {{ t('delete') }}
          </v-btn>
        </template>
        <template #default="{ isActive }">
          <v-card
            :title="t('deleteTitle')"
            data-iframe-height
          >
            <v-card-text>
              {{ t('deleteText', { title: modelValue.title }) }}
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                :disabled="remove.loading.value"
                variant="text"
                @click="isActive.value = false"
              >
                {{ t('cancel') }}
              </v-btn>
              <v-btn
                :loading="remove.loading.value"
                color="warning"
                variant="flat"
                @click="remove.execute()"
              >
                {{ t('delete') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </template>
      </v-menu>
      <v-btn
        color="primary"
        variant="flat"
        :loading="save.loading.value"
        :disabled="!changed || save.loading.value"
        @click="save.execute()"
      >
        {{ modelValue._id ? t('save') : t('add') }}
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

<i18n lang="yaml">
fr:
  topic: Évènement
  title: Libellé
  headerKey: Clé de header HTTP
  headerValue: Valeur de header HTTP
  required: Ce paramètre est requis
  invalidUrl: Cette URL n'est pas valide
  test: Tester
  save: Enregistrer
  add: Ajouter
  testReceived: "Le message de test a été reçu (réponse HTTP {status})."
  testHttpError: "L'URL a répondu par une erreur HTTP {status}."
  testFailed: "L'envoi a échoué : {error}"
  delete: Supprimer
  deleteTitle: Supprimer ce webhook
  deleteText: "Le webhook « {title} » ne sera plus appelé. Pour le retrouver, il faudra le déclarer de nouveau."
  cancel: Annuler
en:
  topic: Event
  title: Label
  headerKey: HTTP header key
  headerValue: HTTP header value
  required: This parameter is required
  invalidUrl: This URL is not valid
  test: Test
  save: Save
  add: Add
  testReceived: "The test message was received (HTTP response {status})."
  testHttpError: "The URL answered with an HTTP error {status}."
  testFailed: "Sending failed: {error}"
  delete: Delete
  deleteTitle: Delete this webhook
  deleteText: "The webhook \"{title}\" will no longer be called. To get it back, it will have to be declared again."
  cancel: Cancel
</i18n>

<script lang="ts" setup>
import type { VForm } from 'vuetify/components'
import type { WebhookSubscription } from '#api/types'

const modelValue = defineModel<Partial<WebhookSubscription> & Required<Pick<WebhookSubscription, 'sender'>>>({ required: true })
const { topics } = defineProps<{ topics: { key: string, title: string }[] }>()
const emit = defineEmits<{ saved: [], deleted: [] }>()

const { t } = useI18n()

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
  if (status && status < 400) testResult.value = { ok: true, message: t('testReceived', { status }) }
  else testResult.value = { ok: false, message: status ? t('testHttpError', { status }) : t('testFailed', { error }) }
})

const remove = useAsyncAction(async () => {
  await $fetch('webhook-subscriptions/' + subscription._id, { method: 'DELETE' })
  emit('deleted')
})
</script>

<style>

</style>
