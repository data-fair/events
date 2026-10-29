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
      Each block reproduces a real host: same d-frame attributes, same query params, a similar container.
      Switch the theme in the app bar (the whole page reloads). Under each frame: its height and the events it emits.
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
      <code class="d-block text-body-small text-break my-2">{{ frameTag(scenario) }}</code>

      <!-- mounted when scrolled to: the dev server cannot serve the modules of every frame at once -->
      <v-lazy min-height="150">
        <v-sheet
          v-if="scenario.wrapper === 'page'"
          height="600"
          border
        >
          <DevFrame :scenario="scenario" />
        </v-sheet>
        <v-card
          v-else-if="scenario.wrapper === 'tab'"
          min-height="550"
        >
          <v-tabs
            :model-value="0"
            density="compact"
          >
            <v-tab>{{ scenario.tab }}</v-tab>
          </v-tabs>
          <v-divider />
          <div class="pa-4">
            <DevFrame :scenario="scenario" />
          </div>
        </v-card>
        <v-sheet
          v-else-if="scenario.wrapper === 'narrow'"
          max-width="600"
          color="background"
        >
          <DevFrame :scenario="scenario" />
        </v-sheet>
        <v-card
          v-else-if="scenario.wrapper === 'dialog'"
          max-width="500"
          title="Notifications"
        >
          <DevFrame :scenario="scenario" />
        </v-card>
        <v-menu
          v-else-if="scenario.wrapper === 'menu'"
          :close-on-content-click="false"
          max-width="500"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              :prepend-icon="mdiBell"
              variant="outlined"
            >
              Open the bell menu
            </v-btn>
          </template>
          <v-card width="500">
            <v-card-title>Notifications</v-card-title>
            <DevFrame :scenario="scenario" />
          </v-card>
        </v-menu>
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

type Scenario = {
  id: string
  title: string
  source: string
  wrapper: 'page' | 'tab' | 'narrow' | 'dialog' | 'menu' | 'block'
  tab?: string
  page: string
  params?: Record<string, string>
  attrs?: Record<string, string>
}

const sender = 'organization:test1'
// hosts pass topic titles in the language of the session, as data-fair does with its settings schema
const datasetTopics = { key: 'dataset-finalized,dataset-error', title: 'Jeu de données finalisé,Erreur sur le jeu de données' }

// copied from the hosts on 2026-10-29, sync-path left out: it would navigate this page
const scenarios: Scenario[] = [
  { id: 'df-events', title: 'data-fair, traceability page', source: 'data-fair/ui/src/pages/events.vue', wrapper: 'page', page: 'embed/events', attrs: { resize: 'no', 'sync-params': '', 'emit-iframe-messages': '' } },
  { id: 'df-events-tab', title: 'data-fair, dataset traceability tab', source: 'data-fair/ui/src/components/common/event-traceability.vue', wrapper: 'tab', tab: 'Traçabilité', page: 'embed/events', params: { resource: 'dataset/communes' }, attrs: { 'sync-params': '' } },
  { id: 'df-subscribe-tab', title: 'data-fair, dataset notifications tab', source: 'data-fair/ui/src/components/common/event-notifications.vue', wrapper: 'tab', tab: 'Notifications', page: 'embed/subscribe', params: { ...datasetTopics, 'url-template': '/data-fair/dataset/communes', sender, register: 'false' } },
  { id: 'df-webhooks-tab', title: 'data-fair, dataset webhooks tab', source: 'data-fair/ui/src/components/common/event-webhooks.vue', wrapper: 'tab', tab: 'Webhooks', page: 'embed/subscribe-webhooks', params: { ...datasetTopics, sender } },
  { id: 'df-devices', title: 'data-fair, notifications page: devices', source: 'data-fair/ui/src/pages/notifications.vue', wrapper: 'block', page: 'embed/devices', attrs: { resize: '' } },
  { id: 'df-subscribe-page', title: 'data-fair, notifications page: topics', source: 'data-fair/ui/src/pages/notifications.vue', wrapper: 'block', page: 'embed/subscribe', params: { ...datasetTopics, 'url-template': '/data-fair/dataset/{id}', register: 'false', header: 'no' }, attrs: { resize: '' } },
  { id: 'portal-me', title: 'portal, personal space: topics', source: 'portals/portal/app/pages/me/notifications.vue', wrapper: 'narrow', page: 'embed/subscribe', params: { ...datasetTopics, 'url-template': '/datasets/{id}', sender, outputs: 'auto' } },
  { id: 'portal-me-devices', title: 'portal, personal space: devices', source: 'portals/portal/app/pages/me/notifications.vue', wrapper: 'narrow', page: 'embed/devices' },
  { id: 'portal-bell', title: 'portal, dataset bell', source: 'portals/portal/app/components/dataset/dataset-notifications.vue', wrapper: 'dialog', page: 'embed/subscribe', params: { ...datasetTopics, 'url-template': '/datasets/communes', register: 'false', sender, outputs: 'auto' }, attrs: { scrolling: 'no', 'aspect-ratio': '' } },
  { id: 'service-bell', title: 'processings, catalogs, simple-directory: bell menu', source: 'processings/ui/src/components/processings-actions.vue', wrapper: 'menu', page: 'embed/subscribe', params: { ...datasetTopics, sender, register: 'false' } },
  // full pages without a host yet, hosted the way data-fair hosts processings and catalogs
  { id: 'events-page', title: 'traceability, full page (no host yet)', source: 'events/ui/src/pages/events.vue', wrapper: 'page', page: 'events', attrs: { resize: 'no', 'sync-params': '' } },
  { id: 'notifications-page', title: 'notifications, full page (no host yet)', source: 'events/ui/src/pages/notifications.vue', wrapper: 'page', page: 'notifications', attrs: { resize: 'no' } },
  { id: 'subscriptions-page', title: 'subscriptions, full page (no host yet)', source: 'events/ui/src/pages/subscriptions.vue', wrapper: 'page', page: 'subscriptions', attrs: { resize: 'no' } }
]

const widths = ['400px', '600px', '960px', 'none']
const width = ref('none')
const selected = ref(scenarios.map(s => s.id))
const reloadKey = ref(0)

const frameSrc = (scenario: Scenario) => {
  const query = scenario.params ? '?' + new URLSearchParams(scenario.params).toString() : ''
  return `${$sitePath}/events/${scenario.page}${query}`
}

const frameTag = (scenario: Scenario) => {
  const attrs = Object.entries(scenario.attrs ?? {}).map(([name, value]) => value ? `${name}="${value}"` : name)
  return `<d-frame src="${decodeURIComponent(frameSrc(scenario).replace(/\+/g, ' '))}"${attrs.map(a => ' ' + a).join('')}>`
}

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
  ...scenario.attrs,
  src: frameSrc(scenario),
  class: scenario.wrapper === 'page' ? 'fill-height' : undefined,
  onReady: () => log(scenario.id, 'ready'),
  onNotif: (e: CustomEvent) => log(scenario.id, 'notif', e.detail),
  onMessage: (e: CustomEvent) => log(scenario.id, 'message', e.detail),
  onStateChange: (e: CustomEvent) => log(scenario.id, 'state-change', e.detail),
  onVnodeMounted: (vnode) => observeHeight(scenario.id, vnode.el as Element),
  onVnodeUnmounted: () => observers[scenario.id]?.disconnect()
})
</script>
