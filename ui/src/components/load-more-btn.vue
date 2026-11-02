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
fr:
  seeMore: Voir plus
en:
  seeMore: See more
</i18n>

<script lang="ts" setup>
const { t } = useI18n()
</script>
