import { createVitestConfig } from '@tcw/config/vitest'

export default createVitestConfig(__dirname, {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/lib/**/*.ts', 'src/lib/**/*.tsx'],
    exclude: ['src/lib/directus/generateDirectusTypes.ts'],
  },
})
