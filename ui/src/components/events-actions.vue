<template>
  <v-list
    density="compact"
    class="px-4"
    style="min-width: 240px; background-color: transparent;"
  >
    <v-text-field
      v-model="searchEdit"
      :append-inner-icon="mdiMagnify"
      variant="outlined"
      placeholder="rechercher"
      clearable
      density="compact"
      color="primary"
      hide-details
      hide-selected
      @blur="search = searchEdit"
      @keydown.enter="search = searchEdit"
      @click:clear="search = ''"
      @click:append-inner="search = searchEdit"
    />
  </v-list>
</template>
<script setup lang="ts">
import { mdiMagnify } from '@mdi/js'
const search = defineModel<string>('search')
const searchEdit = ref(search.value)
</script>
