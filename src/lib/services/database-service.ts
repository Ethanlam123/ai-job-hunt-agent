/**
 * Enhanced Database Service
 *
 * Provides optimized database operations with connection pooling,
 * performance monitoring, and vector search capabilities.
 */

import { createClient } from '@supabase/supabase-js'
import { DatabaseClient, ConnectionPoolStats, DatabaseHealthStatus, QueryPerformanceMetrics, VectorSearchResult, BatchOperationResult, BatchOperationOptions } from '@/lib/types/database'
import { databaseConfig, vectorSearchConfig, getDatabaseUrl, supabaseConfig } from '@/lib/config/database'
import { logger } from '@/lib/utils/secure-logger'

/**
 * Enhanced Supabase client wrapper with performance optimizations
 */
export class EnhancedDatabaseService implements DatabaseClient {
  private supabase: ReturnType<typeof createClient>
  private queryMetrics: QueryPerformanceMetrics[] = []
  private lastHealthCheck: Date | null = null
  private isHealthy = true

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: supabaseConfig.auth,
      global: supabaseConfig.global,
    })

    // Setup performance monitoring
    this.setupPerformanceMonitoring()
  }

  /**
   * Setup performance monitoring for database operations
   */
  private setupPerformanceMonitoring(): void {
    if (supabaseConfig.db.performance.enableQueryLogging) {
      // Enable query logging in development/test environments
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Database performance monitoring enabled', {
          slowQueryThreshold: supabaseConfig.db.performance.slowQueryThreshold,
          enableHealthChecks: supabaseConfig.db.performance.enableHealthChecks,
        })
      }
    }
  }

  /**
   * Execute a query with performance monitoring and retry logic
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const startTime = Date.now()
    let attempt = 0
    const maxRetries = databaseConfig.maxRetryAttempts

    while (attempt <= maxRetries) {
      try {
        // For now, implement a simple placeholder that returns empty results
        // In a real implementation, this would use Supabase client methods
        logger.debug('Query executed (placeholder)', { sql, params })

        const executionTime = Date.now() - startTime
        this.recordQueryMetrics(sql, executionTime, 0)

        // Return empty array as placeholder for now
        return [] as T[]

      } catch (error) {
        attempt++
        const isLastAttempt = attempt > maxRetries

        if (isLastAttempt) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          logger.error('Query failed after retries', {
            query: sql,
            params: this.sanitizeParams(params),
            attempts: attempt,
            error: errorMessage,
          })
          throw error
        }

        // Wait before retry with exponential backoff
        const delay = supabaseConfig.db.retryDelay * Math.pow(2, attempt - 1)
        await this.sleep(delay)
      }
    }

    return []
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(
    callback: (client: DatabaseClient) => Promise<T>,
    options: { timeoutMs?: number; maxRetries?: number } = {}
  ): Promise<T> {
    const startTime = Date.now()
    const timeoutMs = options.timeoutMs || supabaseConfig.db.queryTimeout
    const maxRetries = options.maxRetries || supabaseConfig.db.retryAttempts

    let attempt = 0
    while (attempt <= maxRetries) {
      try {
        // For now, just execute the callback directly without transaction support
        // In a real implementation, this would use proper transaction handling
        logger.debug('Transaction executed (placeholder)', { timeoutMs })

        const executionTime = Date.now() - startTime
        logger.debug('Transaction completed (placeholder)', {
          executionTime,
          attempt: attempt + 1,
        })

        return await callback(this)

      } catch (error) {
        attempt++
        const isLastAttempt = attempt > maxRetries

        if (isLastAttempt) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          logger.error('Transaction failed after retries', {
            attempts: attempt,
            error: errorMessage,
          })
          throw error
        }

        // Check if error is deadlock (can retry)
        if (error instanceof Error && !error.message.includes('deadlock')) {
          throw error // Don't retry non-deadlock errors
        }

        const delay = supabaseConfig.db.retryDelay * Math.pow(2, attempt - 1)
        await this.sleep(delay)
      }
    }

    throw new Error('Transaction failed: Maximum retries exceeded')
  }

  /**
   * Perform vector similarity search with optimization
   */
  async vectorSearch<T = any>(
    vector: number[],
    tableName: string,
    vectorColumn: string,
    options: {
      limit?: number
      threshold?: number
      whereClause?: string
      selectColumns?: string[]
    } = {}
  ): Promise<VectorSearchResult<T>> {
    const startTime = Date.now()
    const limit = options.limit || vectorSearchConfig.similarityLimit
    const threshold = options.threshold || vectorSearchConfig.similarityThreshold
    const selectColumns = options.selectColumns || ['*']

    try {
      // Build optimized vector similarity query
      let query = `
        SELECT ${selectColumns.join(', ')},
               1 - (embedding <=> $1) as similarity
        FROM ${tableName}
        WHERE 1 - (embedding <=> $1) > ${threshold}
      `

      if (options.whereClause) {
        query += ` AND ${options.whereClause}`
      }

      query += ` ORDER BY similarity DESC LIMIT ${limit}`

      const searchTime = Date.now() - startTime

      // Placeholder implementation for vector search
      logger.debug('Vector search executed (placeholder)', { query, threshold, limit })

      const records: T[] = [] // Placeholder - would return actual search results
      const similarities: number[] = [] // Placeholder - would return similarity scores

      logger.debug('Vector search completed (placeholder)', {
        searchTime,
        resultCount: records.length,
        threshold,
        limit,
      })

      return {
        records,
        similarities,
        metadata: {
          totalSearched: records.length,
          searchTimeMs: searchTime,
          indexUsed: vectorSearchConfig.indexName,
          thresholdApplied: threshold,
        },
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Vector search failed', {
        tableName,
        vectorColumn,
        error: errorMessage,
      })
      throw error
    }
  }

  /**
   * Perform batch operations for better performance
   */
  async batchOperation<T>(
    items: T[],
    operation: (batch: T[]) => Promise<void>,
    options: BatchOperationOptions = { batchSize: 100 }
  ): Promise<BatchOperationResult<T>> {
    const startTime = Date.now()
    const {
      batchSize = vectorSearchConfig.batchSize,
      batchDelayMs = 100,
      continueOnError = true,
      maxConcurrentBatches = 3,
    } = options

    const successfulItems: T[] = []
    const failedItems: Array<{ item: T; error: Error }> = []

    // Process items in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)

      try {
        await operation(batch)
        successfulItems.push(...batch)

        // Add delay between batches to prevent overwhelming the database
        if (batchDelayMs > 0 && i + batchSize < items.length) {
          await this.sleep(batchDelayMs)
        }

      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error')

        if (continueOnError) {
          failedItems.push(...batch.map(item => ({ item, error: errorObj })))
          logger.warn('Batch operation failed for some items', {
            batchSize: batch.length,
            failedItems: batch.length,
            error: errorObj.message,
          })
        } else {
          // If not continuing on error, add all remaining items as failed
          const remainingItems = items.slice(i)
          failedItems.push(...remainingItems.map(item => ({ item, error: errorObj })))
          break
        }
      }
    }

    const processingTime = Date.now() - startTime
    const totalProcessed = successfulItems.length + failedItems.length
    const successRate = totalProcessed > 0 ? (successfulItems.length / totalProcessed) * 100 : 0

    logger.info('Batch operation completed', {
      totalItems: items.length,
      successfulItems: successfulItems.length,
      failedItems: failedItems.length,
      successRate,
      processingTime,
    })

    return {
      successfulItems,
      failedItems,
      totalProcessed,
      successRate,
      processingTimeMs: processingTime,
    }
  }

  /**
   * Get connection pool statistics
   */
  async getConnectionPoolStats(): Promise<ConnectionPoolStats> {
    try {
      // Placeholder implementation for connection pool stats
      // In a real implementation, this would query actual database statistics
      const activeConnections = 1 // Placeholder value

      logger.debug('Connection pool stats retrieved (placeholder)', { activeConnections })

      return {
        totalConnections: activeConnections,
        activeConnections,
        idleConnections: Math.max(0, databaseConfig.maxConnections - activeConnections),
        waitingClients: 0, // Would need additional monitoring
        maxPoolSize: databaseConfig.maxConnections,
      }

    } catch (error) {
      logger.error('Failed to get connection pool stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Return default stats on error
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        maxPoolSize: databaseConfig.maxConnections,
      }
    }
  }

  /**
   * Check database health status
   */
  async checkHealth(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now()
    const now = new Date()

    try {
      // Simple health check query
      const { data, error } = await this.supabase
        .from('pg_stat_activity')
        .select('count')
        .limit(1)

      const responseTime = Date.now() - startTime

      if (error) {
        throw new Error(`Health check failed: ${error.message}`)
      }

      const connectionStats = await this.getConnectionPoolStats()
      const errors: string[] = []
      const warnings: string[] = []

      // Determine health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

      if (responseTime > 5000) {
        status = 'degraded'
        warnings.push('High response time detected')
      }

      if (connectionStats.activeConnections > connectionStats.maxPoolSize * 0.8) {
        status = 'degraded'
        warnings.push('High connection pool utilization')
      }

      if (responseTime > 10000) {
        status = 'unhealthy'
        errors.push('Very high response time')
      }

      this.lastHealthCheck = now
      this.isHealthy = status !== 'unhealthy'

      const healthStatus: DatabaseHealthStatus = {
        status,
        connectionPool: connectionStats,
        lastHealthCheck: now,
        responseTimeMs: responseTime,
        errors,
        warnings,
      }

      logger.debug('Database health check completed', {
        status,
        responseTime,
        activeConnections: connectionStats.activeConnections,
      })

      return healthStatus

    } catch (error) {
      this.lastHealthCheck = now
      this.isHealthy = false

      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        status: 'unhealthy',
        connectionPool: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          waitingClients: 0,
          maxPoolSize: databaseConfig.maxConnections,
        },
        lastHealthCheck: now,
        responseTimeMs: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Health check failed'],
        warnings: [],
      }
    }
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    try {
      // Supabase client doesn't have explicit close method in JS
      // Clear any cached connections or resources
      this.queryMetrics = []
      this.lastHealthCheck = null
      this.isHealthy = false

      logger.info('Database service closed')
    } catch (error) {
      logger.error('Error closing database service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Get recent query performance metrics
   */
  getQueryMetrics(limit: number = 100): QueryPerformanceMetrics[] {
    return this.queryMetrics.slice(-limit)
  }

  /**
   * Get slow queries from metrics
   */
  getSlowQueries(threshold?: number): QueryPerformanceMetrics[] {
    const slowThreshold = threshold || supabaseConfig.db.performance.slowQueryThreshold
    return this.queryMetrics.filter(metric => metric.isSlowQuery)
  }

  /**
   * Record query performance metrics
   */
  private recordQueryMetrics(sql: string, executionTime: number, rowCount: number): void {
    const queryType = this.extractQueryType(sql)
    const isSlowQuery = executionTime > supabaseConfig.db.performance.slowQueryThreshold

    const metric: QueryPerformanceMetrics = {
      executionTimeMs: executionTime,
      rowCount,
      queryType,
      timestamp: new Date(),
      isSlowQuery,
      queryHash: this.hashQuery(sql),
    }

    this.queryMetrics.push(metric)

    // Keep only recent metrics (last 1000)
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000)
    }

    // Log slow queries
    if (isSlowQuery) {
      logger.warn('Slow query detected', {
        query: sql.substring(0, 200), // Truncate long queries
        executionTime,
        rowCount,
        queryType,
      })
    }

    // Log if performance monitoring is enabled
    if (supabaseConfig.db.performance.enableQueryLogging) {
      logger.debug('Query executed', {
        executionTime,
        rowCount,
        queryType,
        isSlowQuery,
      })
    }
  }

  /**
   * Extract query type from SQL
   */
  private extractQueryType(sql: string): string {
    const trimmed = sql.trim().toUpperCase()
    if (trimmed.startsWith('SELECT')) return 'SELECT'
    if (trimmed.startsWith('INSERT')) return 'INSERT'
    if (trimmed.startsWith('UPDATE')) return 'UPDATE'
    if (trimmed.startsWith('DELETE')) return 'DELETE'
    if (trimmed.startsWith('CREATE')) return 'CREATE'
    if (trimmed.startsWith('DROP')) return 'DROP'
    if (trimmed.startsWith('ALTER')) return 'ALTER'
    return 'OTHER'
  }

  /**
   * Create hash for query identification
   */
  private hashQuery(sql: string): string {
    // Simple hash implementation - in production, use crypto
    let hash = 0
    for (let i = 0; i < sql.length; i++) {
      const char = sql.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: any[]): any[] {
    return params.map(param => {
      if (typeof param === 'string' && param.length > 100) {
        return param.substring(0, 100) + '...'
      }
      if (typeof param === 'object' && param !== null) {
        return '[Object]'
      }
      return param
    })
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
export const databaseService = new EnhancedDatabaseService()

/**
 * Export convenience functions for common operations
 */
export const executeQuery = <T = any>(sql: string, params?: any[]) =>
  databaseService.query<T>(sql, params)

export const executeTransaction = <T>(callback: (client: DatabaseClient) => Promise<T>) =>
  databaseService.transaction(callback)

export const performVectorSearch = <T = any>(
  vector: number[],
  tableName: string,
  vectorColumn: string,
  options?: any
) => databaseService.vectorSearch<T>(vector, tableName, vectorColumn, options)

export const batchOperation = <T>(
  items: T[],
  operation: (batch: T[]) => Promise<void>,
  options?: BatchOperationOptions
) => databaseService.batchOperation(items, operation, options)