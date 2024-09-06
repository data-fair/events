<template>
  <v-list-item>
    <v-list-item-icon>
      <v-progress-circular
        v-if="webhook.status === 'working' || webhook.status === 'waiting'"
        :size="20"
        color="primary"
        indeterminate
      />
      <v-icon
        v-if="webhook.status === 'error'"
        color="error"
      >
        mdi-alert-circle
      </v-icon>
      <v-icon
        v-if="webhook.status === 'cancelled'"
        color="error"
      >
        mdi-cancel
      </v-icon>
      <v-icon
        v-if="webhook.status === 'ok'"
        color="success"
      >
        mdi-check-circle
      </v-icon>
    </v-list-item-icon>
    <v-list-item-content>
      <v-list-item-title>
        {{ webhook.notification.date | date }} - {{ $t(webhook.status) }}
        <template v-if="webhook.status === 'error' && webhook.lastAttempt">
          {{ webhook.lastAttempt.status || webhook.lastAttempt.error }}
        </template>
      </v-list-item-title>
      <v-list-item-subtitle>
        {{ description }}
      </v-list-item-subtitle>
    </v-list-item-content>
    <v-list-item-action>
      <v-menu
        v-if="webhook.status !== 'waiting' && webhook.status !== 'working'"
        left
      >
        <template #activator="{on, attrs}">
          <v-btn
            icon
            v-bind="attrs"
            v-on="on"
          >
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list dense>
          <v-list-item @click="retry">
            <v-list-item-icon>
              <v-icon color="primary">
                mdi-send
              </v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                {{ $t('retry') }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item
            v-if="webhook.status === 'waiting' || webhook.nextAttempt"
            @click="cancel"
          >
            <v-list-item-icon>
              <v-icon color="warning">
                mdi-cancel
              </v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              <v-list-item-title>
                {{ $t('cancel') }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-list-item-action>
  </v-list-item>
</template>

<i18n lang="yaml">
fr:
  waiting: en attente
  working: en cours
  error: erreur
  ok: ok
  cancelled: annulé
  nbAttempts: "Aucune tentative | 1 tentative | {nbAttempts} tentatives"
  lastAttempt: "dernière {date}"
  nextAttempt: "prochaine {date}"
  retry: renvoyer
  cancel: annuler
en:
  waiting: waiting
  working: working
  error: error
  ok: ok
  cancelled: cancelled
  nbAttempts: "No attempt | 1 attempt | {nbAttempts} attempts"
  lastAttempt: "last {date}"
  nextAttempt: "next {date}"
  retry: retry
  cancel: cancel
</i18n>

<script>
export default {
  props: { webhook: { type: Object, required: true } },
  computed: {
    description () {
      const parts = []
      parts.push(this.$tc('nbAttempts', this.webhook.nbAttempts, this.webhook))
      if (this.webhook.lastAttempt) parts.push(this.$t('lastAttempt', { date: this.$dayjs(this.webhook.lastAttempt.date).format('LLL') }))
      if (this.webhook.nextAttempt) parts.push(this.$t('nextAttempt', { date: this.$dayjs(this.webhook.nextAttempt).format('LLL') }))
      return parts.join(' - ')
    }
  },
  methods: {
    async retry () {
      await this.$axios.$post(`api/v1/webhooks/${this.webhook._id}/_retry`)
      this.$emit('refresh')
    },
    async cancel () {
      await this.$axios.$post(`api/v1/webhooks/${this.webhook._id}/_cancel`)
      this.$emit('refresh')
    }
  }
}
</script>

<style>

</style>
