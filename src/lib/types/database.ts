/**
 * Database Types Module
 *
 * TypeScript types and interfaces for database operations,
 * connection management, and performance monitoring.
 */

export interface ConnectionPoolStats {
  /** Total number of connections in the pool */
  totalConnections: number
  /** Number of active connections */
  activeConnections: number
  /** Number of idle connections */
  idleConnections: number
  /** Number of waiting clients */
  waitingClients: number
  /** Maximum pool size */
  maxPoolSize: number
}

export interface QueryPerformanceMetrics {
  /** Query execution time in milliseconds */
  executionTimeMs: number
  /** Number of rows affected/returned */
  rowCount: number
  /** Query type (SELECT, INSERT, UPDATE, DELETE) */
  queryType: string
  /** Timestamp when query was executed */
  timestamp: Date
  /** Whether query exceeded slow query threshold */
  isSlowQuery: boolean
  /** Query hash for tracking similar queries */
  queryHash?: string
}

export interface DatabaseHealthStatus {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy'
  /** Connection pool status */
  connectionPool: ConnectionPoolStats
  /** Last health check timestamp */
  lastHealthCheck: Date
  /** Response time in milliseconds */
  responseTimeMs: number
  /** Any active errors or warnings */
  errors: string[]
  /** Warnings that don't indicate failure */
  warnings: string[]
}

export interface VectorSearchResult<T = any> {
  /** The matching records */
  records: T[]
  /** Similarity scores for each record */
  similarities: number[]
  /** Search metadata */
  metadata: {
    /** Number of records searched */
    totalSearched: number
    /** Time taken for search in milliseconds */
    searchTimeMs: number
    /** Index used for search */
    indexUsed?: string
    /** Similarity threshold applied */
    thresholdApplied: number
  }
}

export interface BatchOperationOptions {
  /** Size of each batch */
  batchSize: number
  /** Delay between batches in milliseconds */
  batchDelayMs?: number
  /** Continue processing on batch errors */
  continueOnError?: boolean
  /** Maximum concurrent batches */
  maxConcurrentBatches?: number
}

export interface BatchOperationResult<T> {
  /** Successfully processed items */
  successfulItems: T[]
  /** Failed items with their errors */
  failedItems: Array<{
    item: T
    error: Error
  }>
  /** Total number of items processed */
  totalProcessed: number
  /** Success rate as percentage */
  successRate: number
  /** Total processing time in milliseconds */
  processingTimeMs: number
}

export interface DatabaseTransactionOptions {
  /** Isolation level for transaction */
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE'
  /** Transaction timeout in milliseconds */
  timeoutMs?: number
  /** Retry transaction on deadlock */
  retryOnDeadlock?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
}

export interface QueryBuilderOptions {
  /** Columns to select (default: ['*']) */
  selectColumns?: string[]
  /** Custom WHERE clause to override criteria-based WHERE */
  whereClause?: string
  /** Order by clauses */
  orderBy?: OrderByClause | OrderByClause[]
  /** Limit number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Add query performance logging */
  enablePerformanceLogging?: boolean
  /** Add query comments for debugging */
  enableQueryComments?: boolean
  /** Force use of specific index */
  forceIndex?: string
  /** Set query timeout */
  timeoutMs?: number
  /** Enable query result caching */
  enableCache?: boolean
  /** Cache TTL in seconds */
  cacheTtl?: number
}

export interface DatabaseClient {
  /** Execute a single query */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  /** Execute a transaction */
  transaction<T>(callback: (client: DatabaseClient) => Promise<T>, options?: DatabaseTransactionOptions): Promise<T>
  /** Execute batch operations */
  batchOperation<T>(data: T[], operation: (batch: T[]) => Promise<void>, options?: BatchOperationOptions): Promise<BatchOperationResult<T>>
  /** Get connection pool statistics */
  getConnectionPoolStats(): Promise<ConnectionPoolStats>
  /** Check database health */
  checkHealth(): Promise<DatabaseHealthStatus>
  /** Close all connections */
  close(): Promise<void>
}

export interface CacheOptions {
  /** Time to live in seconds */
  ttl: number
  /** Cache key prefix */
  keyPrefix?: string
  /** Enable cache compression */
  enableCompression?: boolean
  /** Maximum cache size in bytes */
  maxSize?: number
}

export interface CacheEntry<T> {
  /** Cached data */
  data: T
  /** Expiration timestamp */
  expiresAt: Date
  /** Cache key */
  key: string
  /** Entry size in bytes */
  size: number
  /** Number of times this entry was accessed */
  accessCount: number
  /** Last access timestamp */
  lastAccessed: Date
}

export interface CacheStats {
  /** Total number of entries */
  totalEntries: number
  /** Cache hit rate as percentage */
  hitRate: number
  /** Current cache size in bytes */
  currentSize: number
  /** Maximum cache size in bytes */
  maxSize: number
  /** Number of evicted entries */
  evictedEntries: number
  /** Cache efficiency score */
  efficiencyScore: number
}

/**
 * Performance monitoring types
 */
export interface PerformanceReport {
  /** Report generation timestamp */
  timestamp: Date
  /** Time period covered by report */
  period: {
    start: Date
    end: Date
  }
  /** Query performance summary */
  queryMetrics: {
    totalQueries: number
    averageExecutionTime: number
    slowQueries: number
    mostFrequentQueries: Array<{
      query: string
      count: number
      avgTime: number
    }>
  }
  /** Connection pool metrics */
  connectionMetrics: ConnectionPoolStats
  /** Cache performance */
  cacheMetrics?: CacheStats
  /** Recommendations */
  recommendations: string[]
}

/**
 * Error types for database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly query?: string,
    public readonly params?: any[],
    public readonly originalError?: Error,
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ConnectionPoolError extends DatabaseError {
  constructor(message: string, public readonly poolStats?: ConnectionPoolStats) {
    super(message, 'CONNECTION_POOL_ERROR')
    this.name = 'ConnectionPoolError'
  }
}

export class QueryTimeoutError extends DatabaseError {
  constructor(query: string, timeoutMs: number) {
    super(`Query timeout after ${timeoutMs}ms`, 'QUERY_TIMEOUT', query)
    this.name = 'QueryTimeoutError'
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, public readonly transactionId?: string) {
    super(message, 'TRANSACTION_ERROR')
    this.name = 'TransactionError'
  }
}

/**
 * Utility types for common database operations
 */
export type QueryResult<T = any> = {
  rows: T[]
  rowCount: number
  command: string
}

export type TransactionCallback<T> = (client: DatabaseClient) => Promise<T>

export type WhereCondition = {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN'
  value: any
}

export type OrderByClause = {
  column: string
  direction: 'ASC' | 'DESC'
}

export type PaginationOptions = {
  limit: number
  offset: number
}

/**
 * Database schema information types
 */
export interface TableInfo {
  tableName: string
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: ForeignKeyInfo[]
  rowLevelSecurity: boolean
}

export interface ColumnInfo {
  columnName: string
  dataType: string
  isNullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
  isUnique: boolean
  characterMaximumLength?: number
}

export interface IndexInfo {
  indexName: string
  columns: string[]
  isUnique: boolean
  isPrimary: boolean
  indexType: string
}

export interface ForeignKeyInfo {
  constraintName: string
  columnName: string
  referencedTable: string
  referencedColumn: string
  onUpdateAction: string
  onDeleteAction: string
}
