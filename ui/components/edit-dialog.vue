<template>
  <v-dialog
    v-model="dialog"
    :fullscreen="$vuetify.breakpoint.smAndDown"
    scrollable
    persistent
    max-width="700px"
  >
    <template #activator="{on}">
      <v-btn
        v-if="!item"
        color="primary"
        fab
        dark
        v-on="on"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-btn
        v-else
        color="primary"
        icon
        text
        v-on="on"
      >
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="title">
        {{ !item ? `Ajout d'un élément` : `Édition d'un élément` }}
      </v-card-title>

      <v-card-text>
        <v-form
          ref="form"
          v-model="valid"
        >
          <v-jsf
            v-if="editItem"
            v-model="editItem"
            :schema="schema"
            :options="{hideReadOnly: true, deleteReadOnly:true}"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          text
          @click.native="dialog = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          @click.native="confirm"
        >
          Enregistrer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import VJsf from '@koumoul/vjsf/lib/VJsf.js'
import '@koumoul/vjsf/lib/deps/third-party.js'
import '@koumoul/vjsf/dist/main.css'
import eventBus from '~/assets/event-bus'

export default {
  components: { VJsf },
  props: {
    schema: { type: Object, default: null },
    item: { type: Object, default: null }
  },
  data: () => ({
    dialog: false,
    valid: false,
    delayed: false,
    editItem: null,
    eventBus
  }),
  created () {
    this.editItem = JSON.parse(JSON.stringify(this.item || {}))
  },
  methods: {
    confirm () {
      if (this.$refs.form.validate()) {
        this.$emit('saved', this.editItem)
        this.dialog = false
      }
    }
  }
}
</script>

<style lang="css" scoped>
</style>
