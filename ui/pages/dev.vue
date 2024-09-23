<template>
  <div>
    <v-app-bar density="comfortable">
      <v-spacer />
      <personal-menu dark-mode-switch />
    </v-app-bar>

    <p>
      <ul>
        <li
          v-for="link in links"
          :key="link"
        >
          <a :href="link">{{ link }}</a>
        </li>
      </ul>
    </p>
    <p>
      Session : <pre>{{ session.state }}</pre>
    </p>
  </div>
</template>

<script setup>
// @ts-expect-error lib does not properly export types for vue components yet
import personalMenu from '@data-fair/lib/vuetivy/personal-menu.vue'
// import { useSession } from '@data-fair/lib/vue/session.js'

const session = useSession()

const links = [
  '/simple-directory',
  '/events/embed/events',
  '/events/embed/subscribe?key=topic1,topic2&title=Topic 1,Topic 2&sender=organization:orga1',
  '/events/embed/subscriptions',
  '/events/embed/subscribe-webhooks?key=topic&title=Topic',
  '/events/embed/notifications',
  '/events/embed/devices'
]
</script>

  <style>

  </style>
