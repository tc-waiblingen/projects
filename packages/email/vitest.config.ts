import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    fsModuleCachePath: resolve(import.meta.dirname, 'node_modules/.vitest-cache'),
  },
})
