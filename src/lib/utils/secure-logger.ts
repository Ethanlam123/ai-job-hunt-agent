/**
 * Secure Logging Utility
 *
 * Provides safe logging that prevents sensitive data leakage
 * Different logging levels for different environments
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  requestId?: string
}

class SecureLogger {
  private logLevel: LogLevel
  private isProduction: boolean

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production'
    this.logLevel = this.isProduction ? LogLevel.ERROR : LogLevel.DEBUG
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'creditCard',
      'ssn',
      'socialSecurityNumber',
      'email',
      'phoneNumber',
      'address',
      'apiKey',
      'privateKey',
      'accessToken',
      'refreshToken'
    ]

    const sanitized = { ...data }

    const sanitize = (obj: any, path = ''): any => {
      if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitize(item, `${path}[${index}]`))
      }

      if (obj && typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key
          const lowerKey = key.toLowerCase()

          // Check if this is a sensitive field
          const isSensitive = sensitiveFields.some(field =>
            lowerKey.includes(field.toLowerCase())
          )

          if (isSensitive) {
            result[key] = '[REDACTED]'
          } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitize(value, currentPath)
          } else {
            result[key] = value
          }
        }
        return result
      }

      return obj
    }

    return sanitize(sanitized)
  }

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString()
    const levelName = LogLevel[level]

    if (context) {
      const sanitizedContext = this.sanitizeData(context)
      return `[${timestamp}] [${levelName}] ${message} ${JSON.stringify(sanitizedContext)}`
    }

    return `[${timestamp}] [${levelName}] ${message}`
  }

  error(message: string, context?: any, requestId?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const logEntry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeData(context),
      requestId
    }

    // Always log errors, but sanitize in production
    if (this.isProduction) {
      console.error(`[ERROR] ${message}`)
      if (requestId) {
        console.error(`[ERROR] Request ID: ${requestId}`)
      }
    } else {
      console.error(this.formatMessage(LogLevel.ERROR, message, context))
    }
  }

  warn(message: string, context?: any, requestId?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return

    if (this.isProduction) {
      console.warn(`[WARN] ${message}`)
    } else {
      console.warn(this.formatMessage(LogLevel.WARN, message, context))
    }
  }

  info(message: string, context?: any, requestId?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return

    if (this.isProduction) {
      // In production, only log essential info messages
      if (message.includes('registration successful') ||
          message.includes('login successful') ||
          message.includes('security')) {
        console.log(`[INFO] ${message}`)
      }
    } else {
      console.log(this.formatMessage(LogLevel.INFO, message, context))
    }
  }

  debug(message: string, context?: any, requestId?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG) || this.isProduction) return

    console.debug(this.formatMessage(LogLevel.DEBUG, message, context))
  }

  // Security-specific logging methods
  security(message: string, context?: any, requestId?: string): void {
    // Always log security events
    const securityContext = {
      ...context,
      category: 'security',
      severity: 'high'
    }

    this.error(`SECURITY: ${message}`, securityContext, requestId)
  }

  auth(message: string, context?: any, requestId?: string): void {
    // Log authentication events with appropriate sanitization
    if (this.isProduction) {
      // In production, don't log sensitive auth details
      const sanitizedContext = {
        timestamp: context?.timestamp,
        ip: context?.ip ? '[REDACTED]' : undefined,
        userAgent: context?.userAgent ? '[REDACTED]' : undefined,
      }
      this.info(`AUTH: ${message}`, sanitizedContext, requestId)
    } else {
      this.info(`AUTH: ${message}`, context, requestId)
    }
  }

  performance(message: string, context?: any, requestId?: string): void {
    // Performance logging - only in non-production
    if (!this.isProduction) {
      this.debug(`PERF: ${message}`, context, requestId)
    }
  }
}

// Create singleton instance
export const logger = new SecureLogger()

// Convenience exports
export const logError = logger.error.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logInfo = logger.info.bind(logger)
export const logDebug = logger.debug.bind(logger)
export const logSecurity = logger.security.bind(logger)
export const logAuth = logger.auth.bind(logger)
export const logPerformance = logger.performance.bind(logger)