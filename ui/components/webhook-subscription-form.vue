<template>
  <v-form
    ref="form"
    lazy
    @submit="save"
  >
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="subscription.title"
          label="Libellé"
          outlined
          dense
          hide-details="auto"
          validate-on-blur
          :rules="[
            v => v && !!v.trim() || 'Ce paramètre est requis',
          ]"
        />
      </v-col>
      <v-col cols="12">
        <v-text-field
          v-model="subscription.url"
          label="URL"
          outlined
          dense
          hide-details="auto"
          validate-on-blur
          :rules="[
            v => v && !!v.trim() || 'Ce paramètre est requis',
            v => !!v.trim().startsWith('http://') || !!v.trim().startsWith('https://') || `Cette URL n'est pas valide`
          ]"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-text-field
          v-model="subscription.header.key"
          label="Clé de header HTTP"
          outlined
          dense
          hide-details="auto"
        />
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-text-field
          v-model="subscription.header.value"
          label="Valeur de header HTTP"
          outlined
          dense
          hide-details="auto"
        />
      </v-col>
    </v-row>
    <v-row class="mx-0 mb-0">
      <v-spacer />
      <confirm-menu
        v-if="initialSubscription._id"
        @confirm="remove"
      />
      <v-btn
        color="primary"
        depressed
        :loading="saving"
        class="ml-2"
        :disabled="JSON.stringify(subscription) === previousState"
        @click="save"
      >
        Enregistrer
      </v-btn>
    </v-row>
  </v-form>
</template>

<script>
export default {
  props: {
    initialSubscription: { type: Object, required: true }
  },
  data () {
    return {
      subscription: {
        title: '',
        url: '',
        header: {
          key: '',
          value: ''
        }
      },
      previousState: null,
      saving: false,
      removing: false
    }
  },
  mounted () {
    this.subscription = {
      ...this.subscription,
      ...this.initialSubscription
    }
    this.previousState = JSON.stringify(this.subscription)
  },
  methods: {
    async save () {
      if (!this.$refs.form.validate()) return
      this.saving = true
      const savedSubscription = await this.$axios.$post('api/v1/webhook-subscriptions', this.subscription)
      this.previousState = JSON.stringify(this.subscription)
      this.$emit('refresh', !this.initialSubscription._id && savedSubscription._id)
      this.saving = false
    },
    async remove () {
      this.removing = true
      await this.$axios.$delete('api/v1/webhook-subscriptions/' + this.subscription._id)
      this.$emit('refresh')
      this.removing = false
    }
  }
}
</script>

<style>

</style>
