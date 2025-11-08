/**
 * Centralized Error Handler
 *
 * Provides consistent error handling patterns across the application
 * with proper logging, user-friendly messages, and error categorization.
 */

import { config, getErrorMessage } from '@/lib/config/app-config'
import { logger } from '@/lib/utils/secure-logger'
import { ERROR_CODES, ERROR_MESSAGES } from '@/lib/config/app-config'

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for better handling and reporting
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  STORAGE = 'storage',
  PROCESSING = 'processing',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

/**
 * Standardized error response structure
 */
export interface StandardError {
  code: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: string
  requestId?: string
  userId?: string
  details?: Record<string, any>
  retryable: boolean
  suggestions?: string[]
}

/**
 * Enhanced Error class with additional metadata
 */
export class ApplicationError extends Error {
  public readonly code: string
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly userId?: string
  public readonly requestId?: string
  public readonly details?: Record<string, any>
  public readonly retryable: boolean
  public readonly suggestions?: string[]
  public readonly timestamp: Date
  public readonly cause?: Error

  constructor({
    code,
    message,
    category,
    severity = ErrorSeverity.MEDIUM,
    userId,
    requestId,
    details,
    retryable = false,
    suggestions,
    cause,
  }: {
    code: string
    message: string
    category: ErrorCategory
    severity?: ErrorSeverity
    userId?: string
    requestId?: string
    details?: Record<string, any>
    retryable?: boolean
    suggestions?: string[]
    cause?: Error
  }) {
    super(message)

    this.name = 'ApplicationError'
    this.code = code
    this.category = category
    this.severity = severity
    this.userId = userId
    this.requestId = requestId
    this.details = details
    this.retryable = retryable
    this.suggestions = suggestions
    this.timestamp = new Date()
    this.cause = cause

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError)
    }
  }

  /**
   * Convert to standardized error response
   */
  toResponse(): StandardError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      details: this.details,
      retryable: this.retryable,
      suggestions: this.suggestions,
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      details: this.details,
      retryable: this.retryable,
      suggestions: this.suggestions,
      stack: this.stack,
      cause: this.cause?.message,
    }
  }
}

/**
 * Error handler utilities
 */
export class ErrorHandler {
  private static instance: ErrorHandler
  private requestIdCounter = 0

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`
  }

  /**
   * Handle and categorize errors
   */
  handleError(error: Error, context?: {
    userId?: string
    operation?: string
    requestId?: string
    details?: Record<string, any>
  }): ApplicationError {
    const requestId = context?.requestId || this.generateRequestId()
    const userId = context?.userId

    // If it's already an ApplicationError, enhance it with context
    if (error instanceof ApplicationError) {
      return new ApplicationError({
        code: error.code,
        message: error.message,
        category: error.category,
        severity: error.severity,
        userId: userId || error.userId,
        requestId: requestId || error.requestId,
        details: { ...error.details, ...context?.details },
        retryable: error.retryable,
        suggestions: error.suggestions,
        cause: error,
      })
    }

    // Categorize and transform regular errors
    const categorizedError = this.categorizeError(error, context)

    // Log the error
    this.logError(categorizedError, context?.operation)

    return categorizedError
  }

  /**
   * Categorize error based on type and message
   */
  private categorizeError(error: Error, context?: {
    userId?: string
    operation?: string
    requestId?: string
    details?: Record<string, any>
  }): ApplicationError {
    const message = error.message.toLowerCase()
    const requestId = context?.requestId || this.generateRequestId()

    // Database errors
    if (message.includes('database') || message.includes('connection') || message.includes('query')) {
      return new ApplicationError({
        code: ERROR_CODES.DATABASE_ERROR,
        message: getErrorMessage(ERROR_CODES.DATABASE_ERROR),
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        userId: context?.userId,
        requestId,
        details: context?.details,
        retryable: true,
        suggestions: ['Please try again in a few moments', 'Check your internet connection'],
        cause: error,
      })
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return new ApplicationError({
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: getErrorMessage(ERROR_CODES.SERVICE_UNAVAILABLE),
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        userId: context?.userId,
        requestId,
        details: context?.details,
        retryable: true,
        suggestions: ['Check your internet connection', 'Try refreshing the page'],
        cause: error,
      })
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return new ApplicationError({
        code: ERROR_CODES.INVALID_INPUT,
        message: getErrorMessage(ERROR_CODES.INVALID_INPUT),
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        userId: context?.userId,
        requestId,
        details: context?.details,
        retryable: false,
        suggestions: ['Please check your input and try again'],
        cause: error,
      })
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication') || message.includes('login')) {
      return new ApplicationError({
        code: ERROR_CODES.UNAUTHORIZED,
        message: getErrorMessage(ERROR_CODES.UNAUTHORIZED),
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        userId: context?.userId,
        requestId,
        details: context?.details,
        retryable: false,
        suggestions: ['Please sign in to continue', 'Check your email and password'],
        cause: error,
      })
    }

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new ApplicationError({
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: getErrorMessage(ERROR_CODES.RATE_LIMIT_EXCEEDED),
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        userId: context?.userId,
        requestId,
        details: context?.details,
        retryable: true,
        suggestions: ['Please wait before trying again', 'Upgrade your plan for higher limits'],
        cause: error,
      })
    }

    // File/Storage errors
    if (message.includes('file') || message.includes('upload') || message.includes('storage')) {
      return new ApplicationError({
        code: ERROR_CODES.UPLOAD_FAILED,
        message: getErrorMessage(ERROR_CODES.UPLOAD_FAILED),
        category: ErrorCategory.STORAGE,
        severity: ErrorSeverity.MEDIUM,
        userId: context?.userId,
        requestId,
        details: context?.details,
        retryable: true,
        suggestions: ['Check file size and format', 'Try uploading a different file'],
        cause: error,
      })
    }

    // External service errors
    if (message.includes('external') || message.includes('api') || message.includes('service')) {
      return new ApplicationError({
        code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        message: getErrorMessage(ERROR_CODES.EXTERNAL_SERVICE_ERROR),
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        userId: context?.userId,
        requestId,
        details: context?.details,
        retryable: true,
        suggestions: ['Please try again in a few moments', 'Contact support if the problem persists'],
        cause: error,
      })
    }

    // Default/unknown errors
    return new ApplicationError({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: getErrorMessage(ERROR_CODES.INTERNAL_ERROR),
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.HIGH,
      userId: context?.userId,
      requestId,
      details: context?.details,
      retryable: false,
      suggestions: ['Please refresh the page and try again', 'Contact support if the problem persists'],
      cause: error,
    })
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: ApplicationError, operation?: string): void {
    const logData = {
      error: error.toJSON(),
      operation,
      environment: config.NODE_ENV,
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('CRITICAL ERROR', logData)
        break
      case ErrorSeverity.HIGH:
        logger.error('HIGH SEVERITY ERROR', logData)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn('MEDIUM SEVERITY ERROR', logData)
        break
      case ErrorSeverity.LOW:
        logger.info('LOW SEVERITY ERROR', logData)
        break
    }
  }

  /**
   * Create specific error types
   */
  static createValidationError(message: string, details?: Record<string, any>): ApplicationError {
    return new ApplicationError({
      code: ERROR_CODES.INVALID_INPUT,
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      details,
      retryable: false,
      suggestions: ['Please check your input and try again'],
    })
  }

  static createAuthenticationError(message?: string): ApplicationError {
    return new ApplicationError({
      code: ERROR_CODES.UNAUTHORIZED,
      message: message || getErrorMessage(ERROR_CODES.UNAUTHORIZED),
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      suggestions: ['Please sign in to continue'],
    })
  }

  static createNotFoundError(resource: string): ApplicationError {
    return new ApplicationError({
      code: ERROR_CODES.NOT_FOUND,
      message: `${resource} not found`,
      category: ErrorCategory.NOT_FOUND,
      severity: ErrorSeverity.LOW,
      retryable: false,
      suggestions: ['Please check the resource identifier and try again'],
    })
  }

  static createConflictError(resource: string, details?: Record<string, any>): ApplicationError {
    return new ApplicationError({
      code: ERROR_CODES.ALREADY_EXISTS,
      message: `${resource} already exists`,
      category: ErrorCategory.CONFLICT,
      severity: ErrorSeverity.MEDIUM,
      details,
      retryable: false,
      suggestions: ['Please use a different identifier or update the existing resource'],
    })
  }

  static createRateLimitError(retryAfter?: number): ApplicationError {
    return new ApplicationError({
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: getErrorMessage(ERROR_CODES.RATE_LIMIT_EXCEEDED),
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      details: { retryAfter },
      retryable: true,
      suggestions: retryAfter
        ? [`Please wait ${retryAfter} seconds before trying again`]
        : ['Please wait before trying again'],
    })
  }

  static createProcessingError(message: string, details?: Record<string, any>): ApplicationError {
    return new ApplicationError({
      code: ERROR_CODES.FILE_PROCESSING_ERROR,
      message,
      category: ErrorCategory.PROCESSING,
      severity: ErrorSeverity.HIGH,
      details,
      retryable: true,
      suggestions: ['Please try again', 'Contact support if the problem persists'],
    })
  }
}

/**
 * Error boundary component props
 */
export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

/**
 * Async error wrapper for server actions
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: {
    userId?: string
    operation?: string
    requestId?: string
  }
): Promise<{ data?: T; error?: ApplicationError }> {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    const errorHandler = ErrorHandler.getInstance()
    const appError = errorHandler.handleError(error as Error, context)
    return { error: appError }
  }
}

/**
 * Server action error handler
 */
export function handleServerError(error: unknown, context?: {
  userId?: string
  operation?: string
  requestId?: string
}): never {
  const errorHandler = ErrorHandler.getInstance()
  const appError = errorHandler.handleError(
    error instanceof Error ? error : new Error(String(error)),
    context
  )

  // In server actions, we throw the error to be handled by the client
  throw appError
}

/**
 * API route error handler
 */
export function handleApiError(error: unknown, context?: {
  userId?: string
  operation?: string
  requestId?: string
}): {
  status: number
  body: StandardError
} {
  const errorHandler = ErrorHandler.getInstance()
  const appError = errorHandler.handleError(
    error instanceof Error ? error : new Error(String(error)),
    context
  )

  // Map error categories to HTTP status codes
  const statusMap = {
    [ErrorCategory.VALIDATION]: 400,
    [ErrorCategory.AUTHENTICATION]: 401,
    [ErrorCategory.AUTHORIZATION]: 403,
    [ErrorCategory.NOT_FOUND]: 404,
    [ErrorCategory.CONFLICT]: 409,
    [ErrorCategory.RATE_LIMIT]: 429,
    [ErrorCategory.EXTERNAL_SERVICE]: 502,
    [ErrorCategory.DATABASE]: 500,
    [ErrorCategory.NETWORK]: 503,
    [ErrorCategory.STORAGE]: 500,
    [ErrorCategory.PROCESSING]: 500,
    [ErrorCategory.SYSTEM]: 500,
    [ErrorCategory.UNKNOWN]: 500,
  }

  const status = statusMap[appError.category] || 500

  return {
    status,
    body: appError.toResponse(),
  }
}

/**
 * Client-side error handler
 */
export function handleClientError(error: unknown, context?: {
  userId?: string
  operation?: string
  requestId?: string
  }): ApplicationError {
  const errorHandler = ErrorHandler.getInstance()
  return errorHandler.handleError(
    error instanceof Error ? error : new Error(String(error)),
    context
  )
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()