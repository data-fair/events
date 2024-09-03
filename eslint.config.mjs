import neostandard from 'neostandard'
import jsdoc from 'eslint-plugin-jsdoc'

export default [
  { ignores: ['ui/*', '**/.type/'] },
  ...neostandard({ ts: true }),
  jsdoc.configs['flat/recommended'],
  {
    rules: {
      'jsdoc/require-returns': 0,
      'jsdoc/require-param-description': 0
    }
  }
]
