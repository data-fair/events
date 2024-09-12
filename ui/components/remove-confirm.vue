<template>
  <v-dialog
    v-model="dialog"
    width="500"
  >
    <template #activator="{ props }">
      <v-btn
        icon
        color="warning"
        variant="text"
        v-bind="props"
        @click="open"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="text-h6">
        Suppression d'un élément
      </v-card-title>

      <v-card-text>
        <p>
          Voulez vous vraiment supprimer l'élément <span
            v-if="label"
            class="text-accent"
          >{{ label }}</span> ?
        </p>
        <p>La suppression est définitive.</p>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click.native="dialog = false"
        >
          Annuler
        </v-btn>
        <v-btn
          color="warning"
          @click.native="$emit('removed');dialog = false"
        >
          Oui
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    label: { type: String, default: null }
  },
  data: () => ({
    dialog: false
  }),
  methods: {
    open(e) {
      this.dialog = true
      e.stopPropagation()
    }
  }
}
</script>
