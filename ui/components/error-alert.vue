<template>
  <v-alert
    v-if="error"
    type="error"
    density="compact"
  >
    {{ txt }}
  </v-alert>
</template>

<script setup lang="ts">
const { error } = defineProps<{ error: { data?: unknown, message?: string, statusText?: string } | string }>()

const txt = computed(() => {
  if (!error) return null
  if (typeof error === 'string') return error
  return error.data ?? error.message ?? error.statusText ?? JSON.stringify(error)
})
</script>
