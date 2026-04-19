import { baseIgnores, baseRules } from '@tcw/config/eslint'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([...baseIgnores, 'public/_pagefind/**']),
  {
    rules: {
      ...baseRules,
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
  },
])
