<template>
  <v-alert
    :elevation="isLocal ? 8 : 0"
    :color="color"
    outlined
    class="pa-0"
  >
    <v-card-title>
      <v-icon
        v-if="registration.type === 'webpush'"
        :color="color"
      >
        mdi-web
      </v-icon>
      <v-icon
        v-else
        :color="color"
      >
        mdi-cellphone
      </v-icon>
      &nbsp;{{ registration.deviceName }}
      <v-spacer />
      <v-btn
        icon
        color="warning"
        title="supprimer cet appareil"
        @click="$emit('delete')"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      {{ infos }}
    </v-card-text>
  </v-alert>
</template>

<script>
export default {
  props: {
    registration: { type: Object, required: true },
    isLocal: { type: Boolean, default: false }
  },
  computed: {
    temporarilyDisabled () {
      return this.registration.disabledUntil && this.registration.disabledUntil > new Date().toISOString()
    },
    infos () {
      const infos = []
      if (this.registration.date) {
        infos.push(`crée ${this.$options.filters.fromNow(this.registration.date)}`)
      }
      if (this.registration.lastSuccess) {
        infos.push(`dernier message ${this.$options.filters.fromNow(this.registration.lastSuccess)}`)
      }
      if (this.registration.disabled === 'errors') {
        infos.push('désactivé pour cause d\'erreurs répétées')
      }
      if (this.registration.disabled === 'gone') {
        infos.push('expiré')
      }
      if (this.temporarilyDisabled) {
        infos.push('désactivé temporairement pour cause d\'erreur')
      }
      return infos.join(', ')
    },
    color () {
      if (this.registration.disabled === 'gone') return 'grey'
      if (this.registration.disabled === 'errors') return 'error'
      if (this.temporarilyDisabled) return 'warning'
      return 'grey darken-2'
    }
  }
}
</script>

<style>

</style>
