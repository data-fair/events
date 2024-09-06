<template>
  <v-container
    fluid
    data-iframe-height
  >
    <div class="title mb-5">
      <v-icon class="mt-n1 mr-1">
        mdi-bell
      </v-icon><span>{{ $tc('notifications', notifications ? notifications.count : 0, {nb: notifications ? notifications.count : 0}) }}</span>
    </div>
    <v-row v-if="notifications">
      <v-col
        v-for="(notification, i) of notifications.results"
        :key="`notification_${i}`"
        class="pt-0 pb-2"
        cols="12"
      >
        <v-hover
          v-slot="{ hover }"
        >
          <v-card
            :elevation="hover ? 2 : 0"
            height="100%"
            rounded
            :href="notification && notification.url"
            target="_blank"
            outlined
          >
            <v-card-text class="d-flex justify-space-between pt-1 pb-1">
              <div class="d-flex align-center">
                <v-avatar
                  size="40"
                  class="mr-3 mt-1"
                >
                  <img
                    v-if="notification.icon && notification.icon.length && notification.icon.toString().trim().startsWith('http')"
                    :src="notification.icon"
                    alt="icon"
                  >
                  <v-icon v-else>
                    mdi-bell
                  </v-icon>
                </v-avatar>
                <div class="d-flex align-center flex-column">
                  <div
                    class="black--text subtitle-1"
                    style="align-self: start;"
                  >
                    {{ typeof notification.title === 'object' ? notification.title[$i18n.locale] || notification.title['en'] || notification.title['fr'] : notification.title }}
                  </div>
                  <div
                    v-if="notification.body && notification.body.length"
                    style="align-self: start;"
                  >
                    {{ notification.body }}
                  </div>
                </div>
              </div>
              <div
                class="d-flex align-center justify-end"
                style="flex-shrink: 0;"
              >
                <v-tooltip top>
                  <template #activator="{ on }">
                    <span v-on="on">{{ notification.date | date('fromNow') }}</span>
                  </template>
                  <span>{{ notification.date | date('LLLL') }}</span>
                </v-tooltip>
              </div>
            </v-card-text>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>
    <div
      v-if="notifications && notifications.count && !(((notifications.results && notifications.results.length) || 0) >= (notifications.count || 0))"
      class="mt-3"
    >
      <v-btn
        block
        @click="page++; refresh()"
      >
        {{ $tc('seeMore') }}
      </v-btn>
    </div>
    <!--    <pre style="font-size: 10px;">{{ notifications }}</pre>-->
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifications: "Aucune notification | {nb} notifications"
  seeMore: "Voir plus"
en:
  notifications: "No notification | {nb} notifications"
  seeMore: "See more"
</i18n>

<script>
import eventBus from 'assets/event-bus'
import { mapGetters, mapState } from 'vuex'

export default {
  layout: 'embed',
  data: () => ({
    eventBus,
    page: 0,
    size: 10,
    notifications: null
  }),
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount']),
    channel () {
      return `user:${this.user.id}:notifications`
    }
  },
  async mounted () {
    await this.refresh()
    eventBus.$emit('subscribe', this.channel)
    eventBus.$on(this.channel, notification => {
      this.refresh(true)
    })
  },
  methods: {
    async refresh (clean) {
      const tmp = await this.$axios.$get('api/v1/notifications', { params: { skip: this.page * this.size, size: this.size } })
      if (!clean && this.notifications && this.notifications.results && this.notifications.results.length) {
        this.notifications.results = this.notifications.results.concat(tmp.results)
      } else {
        this.notifications = tmp
      }
    }
  }
}
</script>
