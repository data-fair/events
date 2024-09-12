import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: '/events/'
  },
  ignore: process.env.NODE_ENV === 'development' ? [] : ['pages/dev.vue'],
  modules: [
    // we don't use eslint plugin yet, as edlint-plugin-vuetify is not compatible with eslint 9
    // see https://github.com/vuetifyjs/eslint-plugin-vuetify/issues/93
    ['@data-fair/lib/nuxt.js', { eslint: false }]
  ],
  compatibilityDate: '2024-08-30'
})
