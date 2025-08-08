import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  // options here
})
  .append(
    // your custom configs here
    {
      rules: {
        // Custom rule overrides
        'vue/multi-word-component-names': 'off',
        '@typescript-eslint/no-unused-vars': 'warn'
      }
    }
  )