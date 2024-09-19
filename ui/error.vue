<template>
  <v-container>
    <v-alert
      v-if="error"
      type="error"
      density="compact"
    >
      {{ error.message }}
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
defineProps<{ error: NuxtError }>()
</script>
