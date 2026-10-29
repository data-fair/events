<template>
  <!-- alone in the menu of narrow screens it would shrink to its icon, in the drawer the drawer sets its width -->
  <search-field
    v-model="input"
    :min-width="display.lgAndUp.value ? undefined : 240"
  />
</template>

<script lang="ts" setup>
import SearchField from '@data-fair/lib-vuetify/search-field.vue'
import { useDisplay } from 'vuetify'

const display = useDisplay()

const search = defineModel<string>({ default: '' })

// lib's field updates on every key stroke, the API search waits for a pause
const input = ref(search.value)
let timeout: ReturnType<typeof setTimeout> | undefined
watch(input, (value) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => { search.value = value ?? '' }, 300)
})
</script>
