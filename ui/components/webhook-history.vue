<template>
  <v-list
    flat
    style="position:relative"
  >
    <v-row class="ma-0">
      <v-spacer />
      <v-btn
        v-if="webhooks && !webhooks.length"
        color="primary"
        depressed
        :loading="testing"
        @click="test"
      >
        tester
        <v-icon right>
          mdi-send
        </v-icon>
      </v-btn>
      <v-spacer />
      <v-btn
        icon
        @click="refresh"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-row>
    <div style="height:4px;width:100%;">
      <v-progress-linear
        v-if="loading"
        stream
        height="4"
        style="margin:0;"
      />
    </div>
    <template v-if="webhooks && webhooks.length">
      <webhook-history-item
        v-for="(webhook) in webhooks"
        :key="webhook._id"
        :webhook="webhook"
        @refresh="refresh"
      />
    </template>
  </v-list>
</template>

<script>
import webhookHistoryItem from './webhook-history-item.vue'

export default {
  components: { webhookHistoryItem },
  props: {
    subscription: { type: Object, default: null }
  },
  data () {
    return {
      loading: false,
      webhooks: null,
      testing: false
    }
  },
  async mounted () {
    await this.refresh()
  },
  methods: {
    async refresh () {
      this.loading = true
      this.webhooks = (await this.$axios.$get('api/v1/webhooks', {
        params: {
          subscription: this.subscription._id,
          size: 100
        }
      })).results
      this.loading = false
    },
    async test () {
      this.testing = true
      await this.$axios.$post(`api/v1/webhook-subscriptions/${this.subscription._id}/_test`)
      await this.refresh()
      this.testing = false
    }
  }
}
</script>

<style>

</style>
