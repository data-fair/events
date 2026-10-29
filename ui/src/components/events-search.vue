<template>
  <search-field v-model="input" />
</template>

<script lang="ts" setup>
import SearchField from '@data-fair/lib-vuetify/search-field.vue'

const search = defineModel<string>({ default: '' })

// lib's field updates on every key stroke, the API search waits for a pause
const input = ref(search.value)
let timeout: ReturnType<typeof setTimeout> | undefined
watch(input, (value) => {
  clearTimeout(timeout)
  timeout = setTimeout(() => { search.value = value ?? '' }, 300)
})
</script>
