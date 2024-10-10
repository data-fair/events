import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: '/events/'
  },
  ignore: process.env.NODE_ENV === 'development' ? [] : ['pages/dev.vue'],
  modules: [
    ['@data-fair/lib/nuxt.js', {}]
  ],
  compatibilityDate: '2024-08-30'
})
