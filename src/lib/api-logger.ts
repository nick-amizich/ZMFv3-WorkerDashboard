import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { logger } from './logger'

export interface ApiLogContext {
  requestId: string
  userId?: string
  endpoint: string
  method: string
  startTime: number
}

// API Request/Response logging middleware
export class ApiLogger {
  // Log incoming API request
  static logRequest(request: NextRequest): ApiLogContext {
    const requestId = randomUUID()
    const startTime = Date.now()
    const endpoint = request.nextUrl.pathname
    const method = request.method
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    // Set correlation ID for this request
    logger.setCorrelationId(requestId)

    logger.apiRequest(method, endpoint, {
      requestId,
      userAgent,
      ip,
      headers: Object.fromEntries(request.headers),
      query: Object.fromEntries(request.nextUrl.searchParams)
    })

    return {
      requestId,
      endpoint,
      method,
      startTime
    }
  }

  // Log API response
  static logResponse(
    context: ApiLogContext, 
    response: NextResponse, 
    userId?: string,
    additionalMetadata?: Record<string, any>
  ): void {
    const duration = Date.now() - context.startTime
    const statusCode = response.status

    logger.apiResponse(context.method, context.endpoint, statusCode, duration, {
      requestId: context.requestId,
      userId,
      responseSize: response.headers.get('content-length'),
      ...additionalMetadata
    })

    // Log performance warnings for slow requests
    if (duration > 5000) {
      logger.warn(`Slow API response: ${context.method} ${context.endpoint}`, 'PERFORMANCE', {
        requestId: context.requestId,
        duration,
        statusCode
      })
    }

    // Log error responses with more detail
    if (statusCode >= 400) {
      logger.error(`API Error: ${statusCode} ${context.method} ${context.endpoint}`, 'API_ERROR', {
        requestId: context.requestId,
        statusCode,
        duration,
        userId
      })
    }
  }

  // Create wrapper for API route handlers
  static wrapHandler<T = any>(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
  ) {
    return async (request: NextRequest, routeContext?: any): Promise<NextResponse<T>> => {
      const logContext = ApiLogger.logRequest(request)
      let response: NextResponse<T>
      let userId: string | undefined
      let error: Error | undefined

      try {
        // Extract user ID from auth if available
        const authHeader = request.headers.get('authorization')
        if (authHeader) {
          // You could decode JWT here to get user ID
          // For now, we'll extract it in the handler
        }

        response = await handler(request, routeContext)
        
        // Try to extract user ID from response headers or other means
        userId = response.headers.get('x-user-id') || undefined

      } catch (err) {
        error = err as Error
        
        // Log the error
        logger.errorWithStack(error, 'API_HANDLER', {
          requestId: logContext.requestId,
          endpoint: logContext.endpoint,
          method: logContext.method
        })

        // Create error response
        response = NextResponse.json(
          { error: 'Internal server error', requestId: logContext.requestId },
          { status: 500 }
        ) as NextResponse<T>
      }

      // Log the response
      ApiLogger.logResponse(logContext, response, userId, {
        error: error?.message
      })

      return response
    }
  }
}

// Supabase operation logger
export class DatabaseLogger {
  static async logQuery<T>(
    operation: string,
    query: () => Promise<T>,
    context: string = 'DATABASE'
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await query()
      const duration = Date.now() - startTime
      
      logger.databaseQuery(operation, duration, 0, {
        success: true
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.errorWithStack(error as Error, context, {
        operation,
        duration,
        query: operation
      })
      
      throw error
    }
  }

  static async logSupabaseQuery<T>(
    operation: string,
    supabaseQuery: Promise<T>,
    context: string = 'SUPABASE'
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await supabaseQuery
      const duration = Date.now() - startTime
      
      // Extract count/data length for logging if available
      let rowCount = 0
      let hasError = false
      
      if (result && typeof result === 'object') {
        if ('error' in result && result.error) {
          hasError = true
          logger.error(`Supabase error: ${operation}`, context, {
            error: (result.error as any).message,
            code: (result.error as any).code,
            details: (result.error as any).details,
            hint: (result.error as any).hint,
            duration
          })
        }
        
        if ('count' in result && typeof result.count === 'number') {
          rowCount = result.count
        } else if ('data' in result && Array.isArray(result.data)) {
          rowCount = result.data.length
        }
      }
      
      if (!hasError) {
        logger.databaseQuery(operation, duration, rowCount, {
          success: true,
          rowCount
        })
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.errorWithStack(error as Error, context, {
        operation,
        duration
      })
      
      throw error
    }
  }
}

// Authentication logger
export class AuthLogger {
  static logLogin(userId: string, metadata?: Record<string, any>): void {
    logger.authEvent('LOGIN_SUCCESS', userId, metadata)
  }

  static logLogout(userId: string, metadata?: Record<string, any>): void {
    logger.authEvent('LOGOUT', userId, metadata)
  }

  static logLoginFailed(email?: string, reason?: string, metadata?: Record<string, any>): void {
    logger.warn('Login attempt failed', 'AUTH', {
      email,
      reason,
      ...metadata
    })
  }

  static logPermissionDenied(userId: string, resource: string, action: string, metadata?: Record<string, any>): void {
    logger.warn('Permission denied', 'AUTH', {
      userId,
      resource,
      action,
      ...metadata
    })
  }

  static logSessionExpired(userId: string, metadata?: Record<string, any>): void {
    logger.info('Session expired', 'AUTH', {
      userId,
      ...metadata
    })
  }
}

// Business logic logger for domain-specific operations
export class BusinessLogger {
  static logBatchTransition(batchId: string, fromStage: string, toStage: string, userId: string): void {
    logger.businessLogic(`Batch ${batchId} transitioned from ${fromStage} to ${toStage}`, 'BATCH', {
      batchId,
      fromStage,
      toStage,
      userId
    })
  }

  static logTaskAssignment(taskId: string, workerId: string, assignedBy: string): void {
    logger.businessLogic(`Task ${taskId} assigned to worker ${workerId}`, 'TASK', {
      taskId,
      workerId,
      assignedBy
    })
  }

  static logTaskCompletion(taskId: string, workerId: string, duration: number): void {
    logger.businessLogic(`Task ${taskId} completed by worker ${workerId}`, 'TASK', {
      taskId,
      workerId,
      duration
    })
  }

  static logQualityHold(batchId: string, reason: string, severity: string, reportedBy: string): void {
    logger.businessLogic(`Quality hold placed on batch ${batchId}`, 'QUALITY', {
      batchId,
      reason,
      severity,
      reportedBy
    })
  }

  static logOrderImport(orderId: string, itemCount: number, source: string): void {
    logger.businessLogic(`Order ${orderId} imported with ${itemCount} items`, 'ORDER', {
      orderId,
      itemCount,
      source
    })
  }
} 