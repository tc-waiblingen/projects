type LogLevel = 'log' | 'info' | 'warn' | 'error'

const formatMessage = (level: LogLevel, context: string, message: string) => {
  const timestamp = new Date().toISOString()
  return `${timestamp} [${level.toUpperCase()}] [${context}] ${message}`
}

export const createLogger = (context: string) => ({
  log: (message: string, ...args: unknown[]) =>
    console.log(formatMessage('log', context, message), ...args),
  info: (message: string, ...args: unknown[]) =>
    console.info(formatMessage('info', context, message), ...args),
  warn: (message: string, ...args: unknown[]) =>
    console.warn(formatMessage('warn', context, message), ...args),
  error: (message: string, ...args: unknown[]) =>
    console.error(formatMessage('error', context, message), ...args),
})

// Default logger for quick use
export const logger = createLogger('App')
