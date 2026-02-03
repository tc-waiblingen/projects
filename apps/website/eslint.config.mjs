import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/types/**',
    // Pagefind generated files:
    'public/_pagefind/**',
  ]),
  {
    rules: {
      "@next/next/no-page-custom-font": "off",
      "react/no-unescaped-entities": ["error", { "forbid": ['>', '}'] }]
    }
  },
])

export default eslintConfig
