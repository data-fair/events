<template>
  <!-- the traceability of a resource in a tab of its page (data-fair datasets and applications): the iframe grows
       with its content, 5 events first. A full page of a host (resize="no") embeds /events/events instead -->
  <!-- below lg the search is a floating button at the top right, the list starts under it not to hide the first date -->
  <v-container
    class="pt-16 pt-lg-4"
    data-iframe-height
  >
    <events-list :first-page-size="5" />
    <navigation-right>
      <events-search v-model="search" />
    </navigation-right>
  </v-container>
</template>

<script lang="ts" setup>
import NavigationRight from '@data-fair/lib-vuetify/navigation-right.vue'

const search = useStringSearchParam('q')
</script>
