import '@testing-library/jest-dom/vitest'

// Polyfill ResizeObserver for jsdom (needed by Headless UI)
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
