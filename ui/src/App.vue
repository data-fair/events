<template>
  <v-app :class="{ 'bg-transparent': embed }">
    <v-main>
      <RouterView />
      <ui-notif />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import uiNotif from '@data-fair/lib-vuetify/ui-notif.vue'

// as in data-fair, the embed pages let their host paint the background (a card, a menu, a portal page),
// the other pages keep the theme background
const route = useRoute()
const embed = computed(() => route.path.startsWith('/embed/'))
</script>
