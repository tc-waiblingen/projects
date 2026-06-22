import baseConfig, { baseIgnores } from '@tcw/config/eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  ...baseConfig,
  globalIgnores([...baseIgnores, '.tmp/**', 'data/**']),
])
