import { randomUUID } from 'crypto'

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

class Logger {
  private static instance: Logger
  private logLevel: LogLevel = LogLevel.INFO
  private correlationId: string = randomUUID()

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
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

  // Core logging methods
  error(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, metadata)
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  warn(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context, metadata)
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  info(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context, metadata)
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  debug(message: string, context: string = 'APP', metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, metadata)
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  // Specialized logging methods for AI assistance
  apiRequest(method: string, url: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, `${method} ${url}`, 'API_REQUEST', metadata)
    entry.api = { method, url }
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  apiResponse(method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, `${method} ${url} - ${statusCode}`, 'API_RESPONSE', metadata)
    entry.api = { method, url, statusCode }
    entry.performance = { duration }
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  databaseQuery(query: string, duration: number, rowCount: number = 0, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, `DB Query executed`, 'DATABASE', metadata)
    entry.database = { query: query.substring(0, 100) + '...', duration, rowCount }
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  authEvent(event: string, userId?: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, `Auth: ${event}`, 'AUTH', metadata)
    entry.userId = userId
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  businessLogic(action: string, context: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, action, context, metadata)
    this.formatForConsole(entry)
    this.persistLog(entry)
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
    this.persistLog(entry)
  }

  // Performance monitoring
  performance(operation: string, duration: number, context: string = 'PERF', metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, `${operation} completed`, context, metadata)
    entry.performance = { 
      duration,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
    this.formatForConsole(entry)
    this.persistLog(entry)
  }

  // Persist logs (implement based on your preference)
  private async persistLog(entry: LogEntry): Promise<void> {
    // Option 1: File system (for local development)
    if (process.env.NODE_ENV === 'development') {
      // Would write to logs/app.log
    }

    // Option 2: Database logging (recommended for production)
    if (process.env.NODE_ENV === 'production') {
      // Would store in Supabase logs table
      await this.logToDatabase(entry)
    }

    // Option 3: External service (Sentry, LogFlare, etc.)
    if (process.env.LOGGING_SERVICE_URL) {
      await this.logToExternalService(entry)
    }
  }

  private async logToDatabase(entry: LogEntry): Promise<void> {
    try {
      // Only log to database on server side to avoid Next.js import issues
      if (typeof window !== 'undefined') {
        // We're on the client side, skip database logging
        return
      }

      // Use a server-side Supabase client for logging
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const logRecord = {
        level: entry.level,
        message: entry.message,
        context: entry.context,
        correlation_id: entry.correlationId,
        request_id: entry.requestId,
        user_id: entry.userId,
        session_id: entry.sessionId,
        api_method: entry.api?.method,
        api_url: entry.api?.url,
        api_status_code: entry.api?.statusCode,
        api_duration: entry.performance?.duration,
        api_user_agent: entry.api?.userAgent,
        api_ip: entry.metadata?.ip,
        db_query: entry.database?.query,
        db_duration: entry.database?.duration,
        db_row_count: entry.database?.rowCount,
        error_name: entry.error?.name,
        error_message: entry.error?.message,
        error_stack: entry.error?.stack,
        error_code: entry.error?.code,
        performance_duration: entry.performance?.duration,
        memory_usage: entry.performance?.memoryUsage,
        metadata: entry.metadata || {}
      }

      // Use type assertion since application_logs table doesn't exist in types yet
      const { error } = await (supabase as any)
        .from('application_logs')
        .insert([logRecord])

      if (error) {
        // Only log to console if database insert fails to avoid infinite loops
        console.error('Failed to insert log to database:', error.message)
      }
    } catch (error) {
      // Fail silently to avoid logging loops
      console.error('Failed to persist log to database:', error)
    }
  }

  private async logToExternalService(entry: LogEntry): Promise<void> {
    try {
      // Send to external logging service
      // Could be Sentry, LogFlare, DataDog, etc.
    } catch (error) {
      // Fail silently
      console.error('Failed to send log to external service:', error)
    }
  }

  // Utility method to create timer for performance logging
  createTimer(operation: string, context: string = 'TIMER'): () => void {
    const start = Date.now()
    return () => {
      const duration = Date.now() - start
      this.performance(operation, duration, context)
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Convenience methods for common use cases
export const logApiRequest = (method: string, url: string, metadata?: Record<string, any>) => 
  logger.apiRequest(method, url, metadata)

export const logApiResponse = (method: string, url: string, statusCode: number, duration: number, metadata?: Record<string, any>) => 
  logger.apiResponse(method, url, statusCode, duration, metadata)

export const logError = (error: Error, context?: string, metadata?: Record<string, any>) => 
  logger.errorWithStack(error, context, metadata)

export const logAuth = (event: string, userId?: string, metadata?: Record<string, any>) => 
  logger.authEvent(event, userId, metadata)

export const logBusiness = (action: string, context: string, metadata?: Record<string, any>) => 
  logger.businessLogic(action, context, metadata)

export const createPerformanceTimer = (operation: string, context?: string) => 
  logger.createTimer(operation, context)

// Set log level based on environment
if (process.env.NODE_ENV === 'development') {
  logger.setLogLevel(LogLevel.DEBUG)
} else {
  logger.setLogLevel(LogLevel.INFO)
} 