<template>
  <v-container fluid>
    <div class="d-flex flex-wrap align-center ga-4 mb-2">
      <h1 class="text-headline-small">
        Integrations
      </h1>
      <v-spacer />
      <v-btn-toggle
        v-model="width"
        density="compact"
        variant="outlined"
        divided
        mandatory
      >
        <v-btn
          v-for="w of widths"
          :key="w"
          :value="w"
        >
          {{ w === 'none' ? 'full width' : w }}
        </v-btn>
      </v-btn-toggle>
      <v-btn
        :prepend-icon="mdiRefresh"
        variant="text"
        @click="reloadKey++"
      >
        Reload frames
      </v-btn>
    </div>
    <p class="text-body-medium text-medium-emphasis mb-4">
      The components of @data-fair/lib-vuetify-events and the embed pages of events, each alone in a plain d-frame:
      no host is reproduced. The widths check narrow containers, the theme switches in the app bar (the whole page
      reloads). Under each frame: its height and the events it emits.
    </p>
    <v-chip-group
      v-model="selected"
      multiple
      column
      class="mb-6"
    >
      <v-chip
        v-for="scenario of scenarios"
        :key="scenario.id"
        :value="scenario.id"
        size="small"
        filter
      >
        {{ scenario.title }}
      </v-chip>
    </v-chip-group>

    <section
      v-for="scenario of scenarios.filter(s => selected.includes(s.id))"
      :key="scenario.id"
      class="mb-10"
      :style="{ maxWidth: width }"
    >
      <h2 class="text-title-large">
        {{ scenario.title }}
      </h2>
      <div class="text-body-small text-medium-emphasis">
        {{ scenario.source }}
      </div>
      <code class="d-block text-body-small text-break my-2">{{ scenario.page ? frameTag(scenario) : scenario.component }}</code>

      <!-- mounted when scrolled to: the dev server cannot serve the modules of every frame at once -->
      <v-lazy min-height="150">
        <!-- the components of @data-fair/lib-vuetify-events alone, the host gives them their container -->
        <v-sheet
          v-if="scenario.id === 'recent-activity'"
          max-width="400"
          color="transparent"
        >
          <df-recent-activity :events-url="$eventsUrl" />
        </v-sheet>
        <df-notification-queue
          v-else-if="scenario.id === 'notification-queue'"
          :events-url="$eventsUrl"
        />
        <DevFrame
          v-else
          :scenario="scenario"
        />
      </v-lazy>

      <pre class="text-body-small text-medium-emphasis mt-2">{{ (logs[scenario.id] ?? []).join('\n') }}</pre>
    </section>
  </v-container>
</template>

<script setup lang="ts">
import { h, type FunctionalComponent } from 'vue'
import '@data-fair/frame/lib/d-frame.js'
import { DfNotificationQueue, DfRecentActivity } from '@data-fair/lib-vuetify-events'
import { $eventsUrl } from '../../context.ts'

type Scenario = {
  id: string
  title: string
  source: string
  // a component of @data-fair/lib-vuetify-events, or an embed page in a d-frame
  component?: string
  page?: string
  params?: Record<string, string>
}

const sender = 'organization:test1'
// hosts pass topic titles in the language of the session, as data-fair does with its settings schema
const topics = { key: 'dataset-finalized,dataset-error', title: 'Jeu de données finalisé,Erreur sur le jeu de données' }

const scenarios: Scenario[] = [
  { id: 'recent-activity', title: 'DfRecentActivity', source: 'lib-vuetify/DfRecentActivity.vue', component: '<df-recent-activity :events-url="$sitePath + \'/events\'" />' },
  { id: 'notification-queue', title: 'DfNotificationQueue', source: 'lib-vuetify/DfNotificationQueue.vue', component: '<df-notification-queue :events-url="$sitePath + \'/events\'" />' },
  { id: 'events', title: 'Traceability of a resource', source: 'ui/src/pages/embed/events.vue', page: 'embed/events', params: { resource: 'dataset/communes' } },
  { id: 'subscribe', title: 'Subscribe to topics', source: 'ui/src/pages/embed/subscribe.vue', page: 'embed/subscribe', params: { ...topics, sender, 'url-template': '/data-fair/dataset/communes' } },
  { id: 'subscribe-webhooks', title: 'Webhooks of topics', source: 'ui/src/pages/embed/subscribe-webhooks.vue', page: 'embed/subscribe-webhooks', params: { ...topics, sender } },
  { id: 'devices', title: 'Devices', source: 'ui/src/pages/embed/devices.vue', page: 'embed/devices' }
]

const widths = ['400px', '600px', '960px', 'none']
const width = ref('none')
const selected = ref(scenarios.map(s => s.id))
const reloadKey = ref(0)

const frameSrc = (scenario: Scenario) => {
  const query = scenario.params ? '?' + new URLSearchParams(scenario.params).toString() : ''
  return `${$sitePath}/events/${scenario.page}${query}`
}

const frameTag = (scenario: Scenario) => `<d-frame src="${decodeURIComponent(frameSrc(scenario).replace(/\+/g, ' '))}">`

const logs = reactive<Record<string, string[]>>({})
const log = (id: string, type: string, detail?: unknown) => {
  const line = `${new Date().toLocaleTimeString()} ${type}${detail === undefined ? '' : ' ' + JSON.stringify(detail)}`
  logs[id] = [line, ...(logs[id] ?? [])].slice(0, 8)
}

const observers: Record<string, ResizeObserver> = {}
const observeHeight = (id: string, el: Element) => {
  let height = -1
  observers[id] = new ResizeObserver(([entry]) => {
    const newHeight = Math.round(entry.contentRect.height)
    if (newHeight !== height) log(id, 'height', (height = newHeight) + 'px')
  })
  observers[id].observe(el)
}

const DevFrame: FunctionalComponent<{ scenario: Scenario }> = ({ scenario }) => h('d-frame', {
  key: `${scenario.id}-${reloadKey.value}`,
  src: frameSrc(scenario),
  onReady: () => log(scenario.id, 'ready'),
  onNotif: (e: CustomEvent) => log(scenario.id, 'notif', e.detail),
  onMessage: (e: CustomEvent) => log(scenario.id, 'message', e.detail),
  onStateChange: (e: CustomEvent) => log(scenario.id, 'state-change', e.detail),
  onVnodeMounted: (vnode) => observeHeight(scenario.id, vnode.el as Element),
  onVnodeUnmounted: () => observers[scenario.id]?.disconnect()
})
</script>
