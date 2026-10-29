<template>
  <div>
    <v-app-bar flat>
      <v-toolbar-items>
        <v-btn
          v-for="[href, title] in links"
          :key="href"
          variant="text"
          :href="href"
        >
          {{ title }}
        </v-btn>
        <v-btn
          variant="text"
          to="/dev/integrations"
        >
          Integrations
        </v-btn>
        <v-btn
          variant="text"
          href="/simple-directory"
          color="primary"
        >
          Simple Directory
        </v-btn>
      </v-toolbar-items>
      <v-spacer />
      <theme-switcher />
      <df-notification-queue :events-url="$eventsUrl" />
      <personal-menu dark-mode-switch />
    </v-app-bar>

    <router-view />
  </div>
</template>

<script setup lang="ts">
import personalMenu from '@data-fair/lib-vuetify/personal-menu.vue'
import themeSwitcher from '@data-fair/lib-vuetify/theme-switcher.vue'
import { DfNotificationQueue } from '@data-fair/lib-vuetify-events'
import { $eventsUrl } from '../context.ts'

const links = [
  ['/events/events', 'Events'],
  ['/events/notifications', 'Notifications'],
  ['/events/subscriptions', 'Subscriptions'],
  ['/events/embed/subscribe?key=topic1,topic2&title=Topic 1,Topic 2&sender=organization:test1', 'Subscribe'],
  ['/events/embed/subscribe-webhooks?key=topic1&title=Topic 1', 'Webhooks'],
  ['/events/embed/devices', 'Devices']
]
</script>
