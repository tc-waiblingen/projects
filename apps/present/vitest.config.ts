import { createVitestConfig } from '@tcw/config/vitest'
import { resolve } from 'path'

const config = createVitestConfig(__dirname, {
  include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/lib/**/*.ts', 'src/lib/**/*.tsx'],
  },
})

config.cacheDir = resolve(__dirname, '.vitest-cache')

export default config
