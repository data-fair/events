import path from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Vuetify from 'vite-plugin-vuetify'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { autoImports, componentsResolver, settingsPath } from '@data-fair/lib-vuetify/vite.js'

// dev ports come from .env (declared in dev/dev.json), checked so a missing variable never becomes NaN
const envPort = (name: string) => {
  const port = Number(process.env[name])
  if (!Number.isInteger(port) || port <= 0) throw new Error(`${name} must be set to a port number, run "npx --no df-dev setup"`)
  return port
}

// https://vitejs.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  base: '/events',
  optimizeDeps: {
    // no discovery: a dependency found while browsing reloads the page, which breaks cold e2e runs;
    // ESM dependencies are served as is, only the commonjs ones must be listed here, with the
    // exact import specifier
    noDiscovery: true,
    include: [
      'debug',
      // owner.js is only imported from lib-vuetify's owner-avatar.vue (via lib-vuetify-events): its
      // import chain reaches the CommonJS ajv-formats, which breaks the /events/dev page served raw
      '@data-fair/lib-vue/owner.js'
    ]
  },
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, 'src/')
    },
  },
  html: {
    cspNonce: '{CSP_NONCE}'
  },
  plugins: [
    VueRouter({
      dts: './dts/typed-router.d.ts',
      // by the vite command, not NODE_ENV that a build can inherit by mistake
      exclude: command === 'build' ? ['src/pages/dev.vue', 'src/pages/dev/**'] : []
    }),
    Vue(),
    VueI18nPlugin(),
    Vuetify({ styles: { configFile: settingsPath } }),
    AutoImport({
      dts: './dts/auto-imports.d.ts',
      vueTemplate: true,
      imports: [
        ...(autoImports as any),
        {
          '~/context': ['$uiConfig', '$sitePath', '$cspNonce', '$apiPath', '$fetch'],
          '@mdi/js': ['mdiBell', 'mdiRefresh', 'mdiSend', 'mdiDelete', 'mdiDevices', 'mdiEmail', 'mdiRss', 'mdiDotsVertical', 'mdiCheckCircle', 'mdiCancel', 'mdiAlertCircle', 'mdiCellphone', 'mdiWeb']
        }
      ],
      dirs: [
        'src/utils',
        'src/composables'
      ]
    }),
    Components({ dts: './dts/components.d.ts', resolvers: [componentsResolver] }),
    {
      name: 'inject-site-context',
      async transformIndexHtml (html) {
        // in production this injection will be performed by an express middleware
        if (process.env.NODE_ENV !== 'development') return html
        const { uiConfig } = await import('../api/src/config.ts')
        return microTemplate(html, { SITE_PATH: '', UI_CONFIG: JSON.stringify(uiConfig), THEME_CSS_HASH: '', PUBLIC_SITE_INFO_HASH: '' })
      }
    }
  ],
  experimental: {
    renderBuiltUrl (filename, { hostType }) {
      if (hostType === 'html') return '{SITE_PATH}/events/' + filename
      return { relative: true }
    }
  },
  // vite preview also runs as serve and must not require the dev ports
  ...(command === 'serve' && !isPreview
    ? { server: { port: envPort('DEV_UI_PORT'), strictPort: true, hmr: { port: envPort('DEV_UI_HMR_PORT') } } }
    : {})
}))
