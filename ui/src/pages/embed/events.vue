<template>
  <!-- the same page as /events/events, at the URL data-fair and portals-manager embed today -->
  <v-container data-iframe-height>
    <events-list />
    <navigation-right>
      <!-- alone in the menu of narrow screens, the field would shrink to its icon -->
      <events-search
        v-model="search"
        min-width="240"
      />
    </navigation-right>
  </v-container>
</template>

<script lang="ts" setup>
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'

const search = useStringSearchParam('q')
</script>
