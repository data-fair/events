import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { defaultOptions } from '@data-fair/lib-vuetify'
import '@data-fair/lib-vuetify/default.scss'
import { createReactiveSearchParams } from '@data-fair/lib-vue/reactive-search-params.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import { createSession } from '@data-fair/lib-vue/session.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import '@koumoul/v-iframe/content-window'
import 'iframe-resizer/js/iframeResizer.contentWindow.js'

(window as any).iFrameResizer = { heightCalculationMethod: 'taggedElement' };

(async function () {
  const router = createRouter({ history: createWebHistory($sitePath + '/events/'), routes })
  const reactiveSearchParams = createReactiveSearchParams(router)
  const session = await createSession({ directoryUrl: $sitePath + '/simple-directory' })
  const localeDayjs = createLocaleDayjs(session.state.lang)
  const uiNotif = createUiNotif()
  const vuetify = createVuetify({
    ...defaultOptions(reactiveSearchParams.state, session.state.dark),
    icons: { defaultSet: 'mdi', aliases, sets: { mdi, } }
  })
  const i18n = createI18n({ locale: session.state.lang });

  (window as any).vIframeOptions = { router }

  createApp(App)
    .use(router)
    .use(reactiveSearchParams)
    .use(session)
    .use(localeDayjs)
    .use(uiNotif)
    .use(vuetify)
    .use(i18n)
    .mount('#app')
})()