// TODO: use this config when eslint-plugin-vuetify is compatible with eslint 9
// see https://github.com/vuetifyjs/eslint-plugin-vuetify/issues/93

import dfLibNuxtRecommended from '@data-fair/lib/eslint/nuxt-recommended.js'
import withNuxt from './.nuxt/eslint.config.mjs'
// cf https://github.com/vuetifyjs/eslint-plugin-vuetify/pull/98
import vuetify from 'eslint-plugin-vuetify/src/index.js'

export default withNuxt([
  ...dfLibNuxtRecommended,
  {
    files: ['**/*.vue'],
    plugins: { vuetify },
    rules: {
      ...vuetify.configs.base.rules
    }
  }
])
