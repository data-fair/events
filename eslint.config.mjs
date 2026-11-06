import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

export default [
  { ignores: ['ui/', '**/.type/', 'data/', 'dev/*', 'lib-vuetify/*.js', 'lib-vuetify/*.d.ts'] },
  ...dfLibRecommended,
  ...neostandard({ ts: true }),
  {
    // server code logs through @data-fair/lib-node/log.js (its README, "Logging")
    files: ['api/src/**/*.{ts,js}', 'api/index.ts'],
    rules: { 'no-console': 'error' }
  }
]
