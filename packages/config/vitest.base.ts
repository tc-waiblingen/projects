import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig, type ViteUserConfig } from 'vitest/config'

type TestOverrides = NonNullable<ViteUserConfig['test']>

export function createVitestConfig(appRoot: string, testOverrides: Partial<TestOverrides> = {}): ViteUserConfig {
  return defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [resolve(appRoot, 'vitest.setup.ts')],
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/lib/**/*.ts', 'src/lib/**/*.tsx'],
      },
      ...testOverrides,
    },
    resolve: {
      alias: {
        '@': resolve(appRoot, './src'),
      },
    },
  })
}
