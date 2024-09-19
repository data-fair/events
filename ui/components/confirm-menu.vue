<template>
  <v-menu
    v-model="menu"
    max-width="500"
    location="left"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="{ ...props, ...btnProps }"
      >
        Supprimer
      </v-btn>
    </template>
    <v-card>
      <v-card-title
        v-if="title"
        primary-title
      >
        {{ title }}
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="alert"
          :type="alert"
          variant="outlined"
        >
          {{ text }}
        </v-alert>
        <template v-else>
          {{ text }}
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="menu = false"
        >
          {{ t('no') }}
        </v-btn>
        <v-btn
          :color="yesColor"
          @click="$emit('confirm')"
        >
          {{ t('yes') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<i18n lang="yaml">
fr:
  yes: Oui
  no: Non
en:
  yes: Yes
  no: No
</i18n>

<script setup lang="ts">
const { t } = useI18n()

defineProps({
  title: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: 'Souhaitez-vous confirmer cette opération ?'
  },
  tooltip: {
    type: String,
    default: ''
  },
  yesColor: {
    type: String,
    default: 'warning'
  },
  btnProps: {
    type: Object,
    default: () => ({ color: 'warning', depressed: true })
  },
  alert: {
    type: String,
    default: ''
  }
})

defineEmits<{ confirm: [] }>()

const menu = ref(false)
</script>

<style lang="css" scoped>
</style>
