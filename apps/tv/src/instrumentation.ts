export async function register() {
  // Only patch in Node.js runtime (server-side)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const addTimestamp = (originalFn: typeof console.log, level: string) => {
      return (...args: unknown[]) => {
        const timestamp = new Date().toISOString()
        originalFn(`${timestamp} [${level}]`, ...args)
      }
    }

    console.log = addTimestamp(console.log, 'LOG')
    console.info = addTimestamp(console.info, 'INFO')
    console.warn = addTimestamp(console.warn, 'WARN')
    console.error = addTimestamp(console.error, 'ERROR')
  }
}
