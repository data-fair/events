<template>
  <v-dialog
    v-model="dialog"
    :fullscreen="$vuetify.breakpoint.smAndDown"
    scrollable
    max-width="700px"
  >
    <template #activator="{on}">
      <v-btn
        color="primary"
        icon
        text
        title="Historique"
        v-on="on"
      >
        <v-icon>mdi-calendar-text</v-icon>
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="title">
        Historique du webhook {{ subscription.title || subscription._id }}
      </v-card-title>

      <v-card-text>
        <webhook-history
          v-if="dialog"
          :subscription="subscription"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          @click.native="dialog = false"
        >
          ok
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    subscription: { type: Object, default: null }
  },
  data: () => ({
    dialog: false
  })
}
</script>

<style lang="css" scoped>
</style>
