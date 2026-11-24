import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  astro: true,
  unocss: true,
  ignores: ['src/content/**'],
  rules: {
    'antfu/reasonable-newline': 'off',
    'e18e/prefer-static-regex': 'off',
  },
})
