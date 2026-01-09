/**
 * Client-Side Logging Utility
 *
 * Provides safe logging for client components that prevents
 * sensitive data leakage and disables debug logging in production.
 *
 * SECURITY: In production, only errors and warnings are logged,
 * and all console.log/debug statements are disabled.
 */

export enum ClientLogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class ClientLogger {
  private isProduction: boolean
  private isDevelopment: boolean

  constructor() {
    // Check if we're in a browser environment
    this.isProduction = process.env.NODE_ENV === 'production'
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  /**
   * Log error messages - always logged
   */
  error(message: string, error?: Error | unknown): void {
    // Errors are always logged but with minimal context in production
    if (this.isProduction) {
      console.error('[Error]', message)
    } else {
      console.error('[Error]', message, error)
    }
  }

  /**
   * Log warning messages - logged in all environments
   */
  warn(message: string, context?: unknown): void {
    if (this.isProduction) {
      console.warn('[Warn]', message)
    } else {
      console.warn('[Warn]', message, context)
    }
  }

  /**
   * Log info messages - only in development
   */
  info(message: string, context?: unknown): void {
    if (!this.isProduction) {
      console.info('[Info]', message, context)
    }
  }

  /**
   * Log debug messages - only in development
   */
  debug(message: string, context?: unknown): void {
    if (this.isDevelopment) {
      console.log('[Debug]', message, context)
    }
  }

  /**
   * Sanitized logging for potentially sensitive data
   * Redacts sensitive fields before logging
   */
  sanitized(message: string, data?: Record<string, unknown>): void {
    if (!this.isDevelopment) return

    if (!data) {
      console.log('[Sanitized]', message)
      return
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'email',
      'phoneNumber',
      'apiKey',
      'accessToken',
    ]

    const sanitized = { ...data }
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase()
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]'
      }
    }

    console.log('[Sanitized]', message, sanitized)
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger()

// Convenience exports
export const logError = clientLogger.error.bind(clientLogger)
export const logWarn = clientLogger.warn.bind(clientLogger)
export const logInfo = clientLogger.info.bind(clientLogger)
export const logDebug = clientLogger.debug.bind(clientLogger)
export const logSanitized = clientLogger.sanitized.bind(clientLogger)
