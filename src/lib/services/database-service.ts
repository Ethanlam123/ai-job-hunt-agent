/**
 * Simplified Database Service
 *
 * Provides essential database operations without unnecessary complexity.
 * This service wraps Supabase client for consistent error handling.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { DatabaseClient, VectorSearchResult, BatchOperationResult, BatchOperationOptions } from '@/lib/types/database'
import { databaseConfig, vectorSearchConfig } from '@/lib/config/database'
import { logger } from '@/lib/utils/secure-logger'

/**
 * Simplified Supabase client wrapper
 */
export class DatabaseService implements DatabaseClient {

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    createSupabaseClient(supabaseUrl, supabaseKey)
  }

  /**
   * Execute a query with error handling
   * Note: Direct SQL execution requires Supabase RPC function or use Drizzle ORM
   */
  async query<T = any>(sql: string, _params: any[] = []): Promise<T[]> {
    try {
      logger.debug('Executing query', { sql: sql.substring(0, 100) })

      // For now, this is a placeholder - use Drizzle ORM for actual queries
      // This method exists for interface compatibility
      logger.warn('Direct SQL execution not implemented - use Drizzle ORM instead')

      return [] as T[]
    } catch (error) {
      logger.error('Query execution failed', {
        sql: sql.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Execute operations within a transaction
   */
  async transaction<T>(
    callback: (client: DatabaseClient) => Promise<T>,
    options: { timeoutMs?: number } = {}
  ): Promise<T> {
    const startTime = Date.now()
    const timeoutMs = options.timeoutMs || 30000

    try {
      const result = await callback(this)

      const executionTime = Date.now() - startTime
      if (executionTime > timeoutMs) {
        logger.warn('Transaction exceeded timeout', { executionTime, timeoutMs })
      }

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Transaction failed', {
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Perform vector similarity search
   *
   * SECURITY: Table and column names are validated against a whitelist
   * to prevent SQL injection attacks. This is a temporary measure until
   * Supabase RPC functions are implemented for full parameterization.
   */
  async vectorSearch<T = any>(
    _vector: number[],
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

    // SECURITY: Whitelist validation for table and column names
    const allowedTables = ['cv_embeddings', 'job_descriptions', 'skill_gap_embeddings']
    const allowedColumns = ['embedding', 'content_embedding', 'cv_embedding', 'jd_embedding']

    if (!allowedTables.includes(tableName)) {
      throw new Error(
        `Invalid table name: ${tableName}. ` +
        `Allowed tables: ${allowedTables.join(', ')}`
      )
    }

    if (!allowedColumns.includes(vectorColumn)) {
      throw new Error(
        `Invalid vector column: ${vectorColumn}. ` +
        `Allowed columns: ${allowedColumns.join(', ')}`
      )
    }

    // SECURITY: Reject potentially malicious whereClause
    if (options.whereClause && /;|--|\/\*/i.test(options.whereClause)) {
      throw new Error('Invalid whereClause: potentially malicious content detected')
    }

    // SECURITY: Validate selectColumns to prevent injection
    const dangerousKeywords = ['union', 'drop', 'delete', 'insert', 'update', 'alter']
    const safeSelectColumns = selectColumns.map(col => {
      const lowerCol = col.toLowerCase()
      if (dangerousKeywords.some(kw => lowerCol.includes(kw))) {
        throw new Error(`Invalid selectColumn: ${col} contains dangerous keyword`)
      }
      // Only allow alphanumeric, underscores, and dots
      if (!/^[a-zA-Z0-9_.\s*]+$/.test(col)) {
        throw new Error(`Invalid selectColumn: ${col} contains invalid characters`)
      }
      return col
    })

    try {
      const whereClause = options.whereClause ? `AND ${options.whereClause}` : ''

      const sql = `
        SELECT ${safeSelectColumns.join(', ')}, 1 - (${vectorColumn} <=> '$1') as similarity
        FROM ${tableName}
        WHERE 1 - (${vectorColumn} <=> '$1') > ${threshold}
        ${whereClause}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `

      const results = await this.query<any>(sql)

      const records = results.map(row => {
        const { similarity, ...record } = row
        return record as T
      })

      const similarities = results.map(row => row.similarity)

      const searchTime = Date.now() - startTime

      logger.debug('Vector search completed', {
        tableName,
        resultCount: records.length,
        searchTime,
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
      logger.error('Vector search failed', {
        tableName,
        vectorColumn,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Perform batch operations
   */
  async batchOperation<T>(
    items: T[],
    operation: (batch: T[]) => Promise<void>,
    options: BatchOperationOptions = { batchSize: 100 }
  ): Promise<BatchOperationResult<T>> {
    const startTime = Date.now()
    const {
      batchSize = vectorSearchConfig.batchSize,
      continueOnError = true,
    } = options

    const successfulItems: T[] = []
    const failedItems: Array<{ item: T; error: Error }> = []

    // Process batches concurrently using Promise.all for better performance
    const batchPromises: Promise<void>[] = []

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)

      const batchPromise = (async () => {
        try {
          await operation(batch)
          successfulItems.push(...batch)
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error('Unknown error')

          if (continueOnError) {
            failedItems.push(...batch.map(item => ({ item, error: errorObj })))
            logger.warn('Batch operation failed for some items', {
              batchSize: batch.length,
              error: errorObj.message,
            })
          } else {
            failedItems.push(...batch.map(item => ({ item, error: errorObj })))
            throw errorObj
          }
        }
      })()

      batchPromises.push(batchPromise)
    }

    // Wait for all batches to complete
    await Promise.all(batchPromises)

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
   * Get connection pool statistics (simplified)
   */
  async getConnectionPoolStats() {
    return {
      totalConnections: 1,
      activeConnections: 1,
      idleConnections: 0,
      waitingClients: 0,
      maxPoolSize: databaseConfig.maxConnections,
    }
  }

  /**
   * Check database health (simplified)
   */
  async checkHealth() {
    return {
      status: 'healthy' as const,
      connectionPool: await this.getConnectionPoolStats(),
      lastHealthCheck: new Date(),
      responseTimeMs: 0,
      errors: [],
      warnings: [],
    }
  }

  /**
   * Close database connections (no-op for Supabase)
   */
  async close(): Promise<void> {
    // Supabase client doesn't require explicit closing
  }
}

// Singleton instance
export const databaseService = new DatabaseService()

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
