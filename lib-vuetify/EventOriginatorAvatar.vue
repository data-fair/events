<template>
  <v-avatar
    v-if="originator?.user?.admin"
    v-tooltip="t('admin')"
    :icon="mdiShieldAlert"
    :size="28"
    color="admin"
  />
  <v-avatar
    v-else-if="originator?.internalProcess"
    v-tooltip="t('internalProcess')"
    :icon="mdiCogRefresh"
    :size="28"
    color="primary"
  />
  <v-avatar
    v-else-if="originator?.apiKey"
    v-tooltip="t('apiKey')"
    :icon="mdiApi"
    :size="28"
    color="primary"
  />
  <owner-avatar
    v-else-if="otherOrganization(event)"
    :owner="{ type: 'organization', id: '', ...originator!.organization! }"
  />
  <owner-avatar
    v-else-if="originator?.user"
    :owner="{ type: 'user', id: '', ...originator.user }"
  />
  <v-avatar
    v-else
    :icon="mdiHistory"
    :size="28"
    :color="fallbackColor"
  />
</template>

<script setup lang="ts">
import type { Event } from '@data-fair/lib-common-types/event/index.js'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiApi, mdiCogRefresh, mdiHistory, mdiShieldAlert } from '@mdi/js'
import OwnerAvatar from '@data-fair/lib-vuetify/owner-avatar.vue'
import { otherOrganization } from './originator.js'

// who did an event: the accounts get their avatar, the admins, processes and api keys an icon
const { event, fallbackColor } = defineProps<{ event: Pick<Event, 'originator' | 'sender'>, fallbackColor?: string }>()

const { t } = useI18n()

const originator = computed(() => event.originator)
</script>

<i18n lang="yaml">
  en:
    admin: Administrator
    internalProcess: Internal process
    apiKey: API key

  fr:
    admin: Administrateur
    internalProcess: Processus interne
    apiKey: Clé d'API
</i18n>
