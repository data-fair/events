<template>
  <!-- a full page of a host (resize="no"): the search goes in the right drawer, like processings and catalogs;
       below lg it is a floating button at the top right, the list starts under it not to hide the first date -->
  <v-container
    class="pt-16 pt-lg-4"
    data-iframe-height
  >
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
