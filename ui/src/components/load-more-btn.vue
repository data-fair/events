<template>
  <v-btn
    variant="text"
    color="primary"
    class="mt-2"
    block
  >
    {{ t('seeMore') }}
  </v-btn>
</template>

<i18n lang="yaml">
en:
  seeMore: See more
fr:
  seeMore: Voir plus
</i18n>

<script lang="ts" setup>
const { t } = useI18n()
</script>
