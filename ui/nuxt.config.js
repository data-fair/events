import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { defineNuxtConfig } from 'nuxt/config'
import autoImports from '@data-fair/lib/vue/auto-imports.js'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  // https://vuetifyjs.com/en/getting-started/installation/#using-nuxt-3
  build: {
    transpile: ['@data-fair/lib/vuetify/']
  },
  app: {
    baseURL: '/events/'
  },
  ignore: process.env.NODE_ENV === 'development' ? [] : ['pages/dev.vue'],
  modules: [
    '@nuxt/eslint',
    ['@nuxtjs/i18n', {
      locales: ['fr', 'en'],
      defaultLocale: 'fr',
      strategy: 'no_prefix',
      detectBrowserLanguage: {
        useCookie: true,
        cookieKey: 'i18n_lang'
      }
    }],
    ['@nuxtjs/google-fonts', {
      families: { Nunito: true }
    }],
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({
          autoImport: true,
          styles: { configFile: new URL('assets/settings.scss', import.meta.url).pathname }
        }))
      })
    }
  ],
  vite: {
    vue: {
      template: {
        transformAssetUrls
      }
    }
  },
  css: ['@/assets/global.scss'],
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never'
      }
    }
  },
  imports: {
    presets: autoImports
  },
  compatibilityDate: '2024-08-30'
})
