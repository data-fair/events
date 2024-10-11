<template>
  <v-form
    ref="form"
    lazy
    @submit="save"
  >
    <v-row>
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
    <v-row class="mx-0 mb-0">
      <v-spacer />
      <confirm-menu
        v-if="modelValue._id"
        @confirm="remove"
      />
      <v-btn
        color="primary"
        variant="flat"
        :loading="saving"
        class="ml-2"
        :disabled="JSON.stringify(subscription) === previousState || saving"
        @click="save"
      >
        Enregistrer
      </v-btn>
    </v-row>
  </v-form>
</template>

<script lang="ts" setup>
import type { VForm } from 'vuetify/components'
import type { WebhookSubscription } from '#api/types'

// const { modelValue } = defineProps<{ modelValue?: WebhookSubscription }>()
const modelValue = defineModel<Partial<WebhookSubscription> & Required<Pick<WebhookSubscription, 'topic' | 'sender'>>>({ required: true })
const emit = defineEmits<{ saved: [], deleted: [] }>()

const form = ref<VForm | null>(null)

const subscription = reactive<Partial<WebhookSubscription> & Required<Pick<WebhookSubscription, 'header'>>>({
  title: '',
  url: '',
  header: {
    key: '',
    value: ''
  }
})

watch(modelValue, () => {
  if (modelValue.value) Object.assign(subscription, modelValue.value)
}, { immediate: true })

const previousState = ref(JSON.stringify(subscription))

const saving = ref(false)
const save = withUiNotif(async () => {
  const valid = (await form.value?.validate())?.valid
  if (!valid) return
  saving.value = true
  await $fetch<WebhookSubscription>('webhook-subscriptions', { method: 'POST', body: subscription })
  previousState.value = JSON.stringify(subscription)
  emit('saved')
  saving.value = false
})

const remove = withUiNotif(async () => {
  await $fetch('api/v1/webhook-subscriptions/' + subscription._id, { method: 'DELETE' })
  emit('deleted')
})
</script>

<style>

</style>
