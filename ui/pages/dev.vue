<template>
  <div>
    <v-app-bar density="comfortable">
      <v-spacer />
      <personal-menu dark-mode-switch />
    </v-app-bar>

    <p>
      <ul>
        <li>
          <a href="/simple-directory/">/simple-directory</a>
        </li>
      </ul>
    </p>
    <p>
      Session : <pre>{{ session.state }}</pre>
    </p>
  </div>
</template>

<script setup lang="ts">
import personalMenu from '@data-fair/lib/vuetivy/personal-menu.vue'
import { useSession } from '@data-fair/lib/vue/session.js'

const session = useSession()
</script>

  <style>

  </style>
