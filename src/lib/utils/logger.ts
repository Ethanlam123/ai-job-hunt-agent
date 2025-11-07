/**
 * Environment-Specific Logger
 *
 * Provides logging functionality with different levels and configurations
 * based on the current environment (development, test, production).
 */

import { config, isDevelopment, isTest, isProduction } from '@/lib/config/app-config'

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  userId?: string
  sessionId?: string
  requestId?: string
  tags?: string[]
  error?: Error
  duration?: number
  source?: string
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableRemote: boolean
  enableStructured: boolean
  maxFileSize: number
  maxFiles: number
  remoteEndpoint?: string
  apiKey?: string
  sanitizeData: boolean
  redactionFields: string[]
  includeStackTrace: boolean
  includeMetadata: boolean
  performanceThresholds: {
    slowQuery: number
    slowApi: number
    slowProcess: number
  }
}

/**
 * Environment-specific logger configurations
 */
const LOGGER_CONFIGS: Record<string, LoggerConfig> = {
  development: {
    level: LogLevel.DEBUG,
    enableConsole: true,
    enableFile: false,
    enableRemote: false,
    enableStructured: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    sanitizeData: false,
    redactionFields: [],
    includeStackTrace: true,
    includeMetadata: true,
    performanceThresholds: {
      slowQuery: 500,
      slowApi: 1000,
      slowProcess: 2000,
    },
  },

  test: {
    level: LogLevel.ERROR, // Only errors in tests
    enableConsole: false,
    enableFile: false,
    enableRemote: false,
    enableStructured: false,
    maxFileSize: 1 * 1024 * 1024, // 1MB
    maxFiles: 1,
    sanitizeData: true,
    redactionFields: ['password', 'token', 'secret', 'key'],
    includeStackTrace: false,
    includeMetadata: false,
    performanceThresholds: {
      slowQuery: 100,
      slowApi: 200,
      slowProcess: 500,
    },
  },

  production: {
    level: LogLevel.INFO,
    enableConsole: false,
    enableFile: true,
    enableRemote: true,
    enableStructured: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    remoteEndpoint: process.env.LOGGING_ENDPOINT,
    apiKey: process.env.LOGGING_API_KEY,
    sanitizeData: true,
    redactionFields: [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'auth',
      'authorization',
      'cookie',
      'session',
      'ssn',
      'creditCard',
      'email',
      'phone',
    ],
    includeStackTrace: true,
    includeMetadata: true,
    performanceThresholds: {
      slowQuery: 1000,
      slowApi: 2000,
      slowProcess: 5000,
    },
  },
}

/**
 * Logger class with environment-aware configuration
 */
export class Logger {
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor() {
    const environment = config.NODE_ENV || 'development'
    this.config = LOGGER_CONFIGS[environment] || LOGGER_CONFIGS.development

    // Start flush interval for buffered logs
    if (this.config.enableRemote || this.config.enableFile) {
      this.startFlushInterval()
    }
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log trace message
   */
  trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context)
  }

  /**
   * Log performance metric
   */
  performance(
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    const threshold = this.config.performanceThresholds.slowProcess
    const level = duration > threshold ? LogLevel.WARN : LogLevel.DEBUG

    this.log(level, `Performance: ${operation}`, {
      ...context,
      duration,
      threshold,
      slow: duration > threshold,
    })
  }

  /**
   * Log API request
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    const threshold = this.config.performanceThresholds.slowApi
    const level = statusCode >= 500 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN :
                  duration > threshold ? LogLevel.INFO :
                  LogLevel.DEBUG

    this.log(level, `API ${method} ${path}`, {
      ...context,
      method,
      path,
      statusCode,
      duration,
      threshold,
      slow: duration > threshold,
    })
  }

  /**
   * Log database query
   */
  databaseQuery(
    query: string,
    duration: number,
    rowCount?: number,
    context?: Record<string, any>
  ): void {
    const threshold = this.config.performanceThresholds.slowQuery
    const level = duration > threshold ? LogLevel.WARN : LogLevel.TRACE

    this.log(level, 'Database Query', {
      ...context,
      query: this.sanitizeQuery(query),
      duration,
      rowCount,
      threshold,
      slow: duration > threshold,
    })
  }

  /**
   * Log user action
   */
  userAction(
    action: string,
    userId?: string,
    context?: Record<string, any>
  ): void {
    this.log(LogLevel.INFO, `User Action: ${action}`, {
      ...context,
      userId,
      action,
      category: 'user_action',
    })
  }

  /**
   * Log security event
   */
  security(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Record<string, any>
  ): void {
    const level = severity === 'critical' ? LogLevel.ERROR :
                  severity === 'high' ? LogLevel.WARN :
                  LogLevel.INFO

    this.log(level, `Security Event: ${event}`, {
      ...context,
      event,
      severity,
      category: 'security',
    })
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger()
    childLogger.config = { ...this.config }

    // Override log method to include parent context
    childLogger.log = (level: LogLevel, message: string, additionalContext?: Record<string, any>, error?: Error) => {
      const mergedContext = { ...context, ...additionalContext }
      Logger.prototype.log.call(this, level, message, mergedContext, error)
    }

    return childLogger
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    // Check if we should log at this level
    if (level > this.config.level) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.config.sanitizeData ? this.sanitizeContext(context) : context,
      error,
      source: this.getSource(),
    }

    // Add user context if available
    if (context?.userId) {
      entry.userId = context.userId
    }

    // Add request/session context if available
    if (context?.requestId) {
      entry.requestId = context.requestId
    }

    if (context?.sessionId) {
      entry.sessionId = context.sessionId
    }

    // Add duration if available
    if (context?.duration) {
      entry.duration = context.duration
    }

    // Add tags for categorization
    entry.tags = this.extractTags(context, message)

    // Handle log output based on configuration
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    if (this.config.enableFile || this.config.enableRemote) {
      this.bufferLog(entry)
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const levelName = LogLevel[entry.level].padEnd(5)
    const prefix = `${timestamp} [${levelName}]`

    let message = `${prefix} ${entry.message}`

    // Add context information
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2)
      message += `\nContext: ${contextStr}`
    }

    // Add error information
    if (entry.error) {
      message += `\nError: ${entry.error.message}`
      if (this.config.includeStackTrace && entry.error.stack) {
        message += `\nStack: ${entry.error.stack}`
      }
    }

    // Log with appropriate console method
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message)
        break
      case LogLevel.WARN:
        console.warn(message)
        break
      case LogLevel.INFO:
        console.info(message)
        break
      case LogLevel.DEBUG:
        console.debug(message)
        break
      case LogLevel.TRACE:
        console.trace(message)
        break
    }
  }

  /**
   * Buffer log entry for later processing
   */
  private bufferLog(entry: LogEntry): void {
    this.logBuffer.push(entry)

    // Flush buffer if it gets too large
    if (this.logBuffer.length >= 100) {
      this.flushBuffer()
    }
  }

  /**
   * Flush buffered logs
   */
  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return
    }

    const entries = [...this.logBuffer]
    this.logBuffer = []

    try {
      if (this.config.enableRemote && this.config.remoteEndpoint) {
        await this.sendToRemote(entries)
      }

      if (this.config.enableFile) {
        await this.writeToFile(entries)
      }
    } catch (error) {
      // Fallback to console if remote/file logging fails
      console.error('Failed to flush logs:', error)
      entries.forEach(entry => this.logToConsole(entry))
    }
  }

  /**
   * Send logs to remote endpoint
   */
  private async sendToRemote(entries: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint || !this.config.apiKey) {
      return
    }

    const payload = {
      logs: entries.map(entry => ({
        ...entry,
        environment: config.NODE_ENV,
        service: 'ai-job-hunt-agent',
        version: config.APP_VERSION,
      })),
    }

    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'User-Agent': `${config.APP_NAME}/${config.APP_VERSION}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Remote logging failed: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Write logs to file (simplified implementation)
   */
  private async writeToFile(entries: LogEntry[]): Promise<void> {
    // In a real implementation, this would write to a log file
    // For now, we'll just use console as fallback
    if (isDevelopment) {
      entries.forEach(entry => {
        const logLine = JSON.stringify(entry)
        console.log(`[FILE] ${logLine}`)
      })
    }
  }

  /**
   * Start automatic flush interval
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushBuffer().catch(error => {
        console.error('Failed to flush logs:', error)
      })
    }, 5000) // Flush every 5 seconds
  }

  /**
   * Stop automatic flush interval
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }

    // Flush remaining logs
    this.flushBuffer().catch(console.error)
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) {
      return context
    }

    const sanitized = { ...context }

    for (const field of this.config.redactionFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    // Redate nested sensitive fields
    const redactNested = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj
      }

      if (Array.isArray(obj)) {
        return obj.map(redactNested)
      }

      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (this.config.redactionFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]'
        } else {
          result[key] = redactNested(value)
        }
      }
      return result
    }

    return redactNested(sanitized)
  }

  /**
   * Sanitize SQL query to remove sensitive data
   */
  private sanitizeQuery(query: string): string {
    if (!query) {
      return query
    }

    // Remove potential sensitive data from queries
    return query
      .replace(/('.*?'|".*?")/g, '[REDACTED]') // Replace string literals
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED]') // Credit cards
      .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[REDACTED]') // SSN
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED]') // Emails
  }

  /**
   * Extract tags from context and message
   */
  private extractTags(context?: Record<string, any>, message?: string): string[] {
    const tags: string[] = []

    // Add category from context
    if (context?.category) {
      tags.push(context.category)
    }

    // Add tags from message content
    if (message) {
      if (message.toLowerCase().includes('error')) tags.push('error')
      if (message.toLowerCase().includes('performance')) tags.push('performance')
      if (message.toLowerCase().includes('security')) tags.push('security')
      if (message.toLowerCase().includes('api')) tags.push('api')
      if (message.toLowerCase().includes('database')) tags.push('database')
      if (message.toLowerCase().includes('auth')) tags.push('auth')
    }

    // Add environment-specific tags
    if (isDevelopment) tags.push('development')
    if (isTest) tags.push('test')
    if (isProduction) tags.push('production')

    return tags
  }

  /**
   * Get source information for log entry
   */
  private getSource(): string {
    if (isDevelopment) {
      // In development, include call stack information
      const stack = new Error().stack
      if (stack) {
        const lines = stack.split('\n')
        // Find the first line that's not from the logger itself
        for (const line of lines.slice(3, 8)) { // Skip internal frames
          if (line && !line.includes('logger.ts')) {
            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/)
            if (match) {
              return `${match[2]}:${match[3]}`
            }
          }
        }
      }
    }

    return 'unknown'
  }
}

/**
 * Secure logger wrapper that prevents sensitive data logging
 */
export class SecureLogger {
  private logger: Logger

  constructor() {
    this.logger = new Logger()
  }

  /**
   * Log error message with sanitization
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.logger.error(message, this.sanitizeContext(context), error)
  }

  /**
   * Log warning message with sanitization
   */
  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, this.sanitizeContext(context))
  }

  /**
   * Log info message with sanitization
   */
  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, this.sanitizeContext(context))
  }

  /**
   * Log debug message with sanitization
   */
  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, this.sanitizeContext(context))
  }

  /**
   * Log trace message with sanitization
   */
  trace(message: string, context?: Record<string, any>): void {
    this.logger.trace(message, this.sanitizeContext(context))
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) {
      return context
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'auth',
      'authorization',
      'cookie',
      'session',
      'ssn',
      'creditCard',
      'email',
      'phone',
      'address',
      'birthday',
      'fullname',
      'name',
    ]

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize)
      }

      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()

        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]'
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitize(value)
        } else {
          result[key] = value
        }
      }
      return result
    }

    return sanitize(context)
  }

  /**
   * Get underlying logger instance
   */
  getUnderlyingLogger(): Logger {
    return this.logger
  }
}

// Create singleton instances
export const logger = new Logger()
export const secureLogger = new SecureLogger()

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    logger.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logger.stop()
    process.exit(0)
  })
}