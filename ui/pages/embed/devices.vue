<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-row
      v-if="!loading && registrations"
      class="ma-0"
    >
      <register-device
        :registrations="registrations"
        @register="refresh"
        @registration="r => localRegistration = r"
      />
    </v-row>
    <v-row v-if="registrations">
      <v-col
        v-for="(registration, i) of registrations"
        :key="i"
        cols="12"
        md="6"
        lg="4"
        xl="3"
      >
        <device-card
          :registration="registration"
          :is-local="localRegistration === registration"
          @delete="remove(i)"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  layout: 'embed',
  data () {
    return {
      loading: false,
      registrations: null,
      localRegistration: null
    }
  },
  async created () {
    this.refresh()
  },
  methods: {
    async refresh () {
      this.loading = true
      this.registrations = await this.$axios.$get('api/v1/push/registrations')
      this.loading = false
    },
    async saveRegistrations () {
      await this.$axios.$put('api/v1/push/registrations', this.registrations)
      await this.refresh()
    },
    async remove (i) {
      this.registrations.splice(i, 1)
      await this.saveRegistrations()
    }
  }
}
</script>

<style>
</style>
