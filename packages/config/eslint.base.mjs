import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

export const baseIgnores = ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'src/types/**']

export const baseRules = {
  '@next/next/no-page-custom-font': 'off',
}

export const baseConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(baseIgnores),
  { rules: baseRules },
])

export default baseConfig
