<template>
  <v-app :class="{ 'bg-transparent': embedded }">
    <v-main>
      <RouterView />
      <ui-notif />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import uiNotif from '@data-fair/lib-vuetify/ui-notif.vue'

// in an iframe (a d-frame or not) the host paints the background: a card, a menu, a portal page
const embedded = window.self !== window.top
</script>
