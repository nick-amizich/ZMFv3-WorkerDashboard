// Browser-compatible UUID generator
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  
  // Fallback to manual generation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Structured log entry interface
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: string
  correlationId?: string
  userId?: string
  sessionId?: string
  requestId?: string
  metadata?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  performance?: {
    duration?: number
    memoryUsage?: number
  }
  database?: {
    query?: string
    duration?: number
    rowCount?: number
  }
  api?: {
    method?: string
    url?: string
    statusCode?: number
    userAgent?: string
  }
}

class ClientLogger {
  private static instance: ClientLogger
  private logLevel: LogLevel = LogLevel.INFO
  private correlationId: string = generateUUID()

  static getInstance(): ClientLogger {
    if (!ClientLogger.instance) {
      ClientLogger.instance = new ClientLogger()
    }
    return ClientLogger.instance
  }

  // Set correlation ID for request tracing
  setCorrelationId(id: string): void {
    this.correlationId = id
  }

  // Set log level
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      correlationId: this.correlationId,
      metadata,
    }
  }

  private formatForConsole(entry: LogEntry): void {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG']
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.INFO]: '\x1b[36m',  // Cyan
      [LogLevel.DEBUG]: '\x1b[37m', // White
    }
    const resetColor = '\x1b[0m'

    const prefix = `${colors[entry.level]}[${levelNames[entry.level]}]${resetColor}`
    const timestamp = `\x1b[90m${entry.timestamp}${resetColor}`
    const context = `\x1b[35m[${entry.context}]${resetColor}`
    const correlation = entry.correlationId ? `\x1b[90m{${entry.correlationId.slice(0, 8)}}${resetColor}` : ''

    console.log(`${prefix} ${timestamp} ${context} ${correlation} ${entry.message}`)
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log('  Metadata:', entry.metadata)
    }
    
    if (entry.error) {
      console.error('  Error:', entry.error)
    }

    if (entry.performance) {
      console.log(`  Performance: ${entry.performance.duration}ms`)
    }

    if (entry.database) {
      console.log(`  Database: ${entry.database.query} (${entry.database.duration}ms, ${entry.database.rowCount} rows)`)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  // Core logging methods - client-safe (console only)
  error(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata)
    this.formatForConsole(entry)
  }

  warn(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata)
    this.formatForConsole(entry)
  }

  info(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata)
    this.formatForConsole(entry)
  }

  debug(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata)
    this.formatForConsole(entry)
  }

  // Error logging with stack traces
  errorWithStack(error: Error, context: string = 'APP', metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.ERROR, error.message, context, metadata)
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    }
    this.formatForConsole(entry)
  }

  // Business logic logging
  businessLogic(action: string, context: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, action, context, metadata)
    this.formatForConsole(entry)
  }

  // Utility method to create timer for performance logging
  createTimer(operation: string, context: string = 'TIMER'): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      const entry = this.createLogEntry(LogLevel.INFO, `${operation} completed`, context)
      entry.performance = { duration }
      this.formatForConsole(entry)
    }
  }
}

// Export singleton instance
export const clientLogger = ClientLogger.getInstance()

// Convenience methods for client components
export const logError = (error: Error, context?: string, metadata?: Record<string, any>) => 
  clientLogger.errorWithStack(error, context, metadata)

export const logBusiness = (action: string, context: string, metadata?: Record<string, any>) => 
  clientLogger.businessLogic(action, context, metadata)

export const createPerformanceTimer = (operation: string, context?: string) => 
  clientLogger.createTimer(operation, context)

// Set log level based on environment
if (process.env.NODE_ENV === 'development') {
  clientLogger.setLogLevel(LogLevel.DEBUG)
} else {
  clientLogger.setLogLevel(LogLevel.INFO)
} 