<template>
  <!-- a full page of a host (resize="no"): the search goes in the right drawer, like processings and catalogs -->
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
