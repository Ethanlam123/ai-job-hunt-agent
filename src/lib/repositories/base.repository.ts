/**
 * Base Repository Interface
 *
 * Defines the contract for data access operations with
 * proper separation of concerns between business logic
 * and data persistence.
 */

import { DatabaseClient, QueryBuilderOptions, BatchOperationOptions, BatchOperationResult } from '@/lib/types/database'

/**
 * Generic repository interface for data access operations
 */
export interface IBaseRepository<T, ID = string> {
  /** Find entity by ID */
  findById(id: ID, options?: QueryBuilderOptions): Promise<T | null>

  /** Find one entity by criteria */
  findOne(criteria: Partial<T>, options?: QueryBuilderOptions): Promise<T | null>

  /** Find multiple entities by criteria */
  findMany(criteria?: Partial<T>, options?: QueryBuilderOptions): Promise<T[]>

  /** Find entities with pagination */
  findWithPagination(
    page: number,
    limit: number,
    criteria?: Partial<T>,
    options?: QueryBuilderOptions
  ): Promise<{
    items: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  }>

  /** Create new entity */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, options?: QueryBuilderOptions): Promise<T>

  /** Create multiple entities */
  createMany(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[], options?: BatchOperationOptions): Promise<BatchOperationResult<T>>

  /** Update entity by ID */
  update(id: ID, data: Partial<T>, options?: QueryBuilderOptions): Promise<T | null>

  /** Update multiple entities by criteria */
  updateMany(criteria: Partial<T>, data: Partial<T>, options?: QueryBuilderOptions): Promise<number>

  /** Delete entity by ID */
  delete(id: ID, options?: QueryBuilderOptions): Promise<boolean>

  /** Delete multiple entities by criteria */
  deleteMany(criteria: Partial<T>, options?: QueryBuilderOptions): Promise<number>

  /** Count entities by criteria */
  count(criteria?: Partial<T>, options?: QueryBuilderOptions): Promise<number>

  /** Check if entity exists by criteria */
  exists(criteria: Partial<T>, options?: QueryBuilderOptions): Promise<boolean>

  /** Execute raw query */
  query<R = any>(sql: string, params?: any[], options?: QueryBuilderOptions): Promise<R[]>
}

/**
 * Abstract base repository implementation
 */
export abstract class BaseRepository<T, ID = string> implements IBaseRepository<T, ID> {
  constructor(
    protected readonly db: DatabaseClient,
    protected readonly tableName: string,
    protected readonly primaryKey: string = 'id'
  ) {}

  /**
   * Get table name for queries
   */
  protected getTable(): string {
    return this.tableName
  }

  /**
   * Get primary key name
   */
  protected getPrimaryKey(): string {
    return this.primaryKey
  }

  /**
   * Build WHERE clause from criteria
   */
  protected buildWhereClause(criteria: Partial<T>): { clause: string; params: any[] } {
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    return { clause, params }
  }

  /**
   * Build SELECT query
   */
  protected buildSelectQuery(
    criteria?: Partial<T>,
    options: QueryBuilderOptions = {}
  ): { sql: string; params: any[] } {
    const { selectColumns = ['*'], whereClause, orderBy, limit, offset } = options

    const { clause: whereClauseStr, params } = this.buildWhereClause(criteria || {})

    let sql = `SELECT ${selectColumns.join(', ')} FROM ${this.getTable()}`

    if (whereClauseStr) {
      sql += ` ${whereClauseStr}`
    }

    if (orderBy) {
      const orderClauses = Array.isArray(orderBy) ? orderBy : [orderBy]
      sql += ` ORDER BY ${orderClauses.map(o => `${o.column} ${o.direction}`).join(', ')}`
    }

    if (limit) {
      sql += ` LIMIT ${limit}`
    }

    if (offset) {
      sql += ` OFFSET ${offset}`
    }

    return { sql, params }
  }

  /**
   * Find entity by ID
   */
  async findById(id: ID, options: QueryBuilderOptions = {}): Promise<T | null> {
    const criteria = { [this.getPrimaryKey()]: id } as Partial<T>
    return this.findOne(criteria, options)
  }

  /**
   * Find one entity by criteria
   */
  async findOne(criteria: Partial<T>, options: QueryBuilderOptions = {}): Promise<T | null> {
    const { sql, params } = this.buildSelectQuery(criteria, { ...options, limit: 1 })
    const results = await this.db.query<T>(sql, params)
    return results[0] || null
  }

  /**
   * Find multiple entities by criteria
   */
  async findMany(criteria?: Partial<T>, options: QueryBuilderOptions = {}): Promise<T[]> {
    const { sql, params } = this.buildSelectQuery(criteria, options)
    return this.db.query<T>(sql, params)
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    criteria?: Partial<T>,
    options: QueryBuilderOptions = {}
  ) {
    const offset = (page - 1) * limit

    // Get total count
    const total = await this.count(criteria, options)

    // Get items
    const items = await this.findMany(criteria, {
      ...options,
      limit,
      offset,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    }
  }

  /**
   * Create new entity
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, options: QueryBuilderOptions = {}): Promise<T> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')

    const sql = `
      INSERT INTO ${this.getTable()} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `

    const results = await this.db.query<T>(sql, values)

    if (results.length === 0) {
      throw new Error('Failed to create entity')
    }

    return results[0]
  }

  /**
   * Create multiple entities
   */
  async createMany(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[],
    options: BatchOperationOptions = { batchSize: 100 }
  ): Promise<BatchOperationResult<T>> {
    const successfulItems: T[] = []
    const failedItems: Array<{ item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>; error: Error }> = []
    const startTime = Date.now()

    try {
      // Process in batches
      for (let i = 0; i < data.length; i += options.batchSize) {
        const batch = data.slice(i, i + options.batchSize)

        try {
          const keys = Object.keys(batch[0])
          const valuesList = batch.map(item => Object.values(item))

          const placeholders = valuesList
            .map((_, batchIndex) =>
              `(${keys.map((_, keyIndex) => `$${batchIndex * keys.length + keyIndex + 1}`).join(', ')})`
            )
            .join(', ')

          const flatValues = valuesList.flat()

          const sql = `
            INSERT INTO ${this.getTable()} (${keys.join(', ')})
            VALUES ${placeholders}
            RETURNING *
          `

          const results = await this.db.query<T>(sql, flatValues)
          successfulItems.push(...results)
        } catch (error) {
          // Add failed items
          batch.forEach(item => {
            failedItems.push({
              item,
              error: error instanceof Error ? error : new Error(String(error))
            })
          })

          // Continue processing unless continueOnError is false
          if (!options.continueOnError) {
            break
          }
        }

        // Add delay between batches if specified
        if (options.batchDelayMs && i + options.batchSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, options.batchDelayMs))
        }
      }
    } catch (error) {
      // Handle any unexpected errors
      data.forEach(item => {
        failedItems.push({
          item,
          error: error instanceof Error ? error : new Error(String(error))
        })
      })
    }

    const processingTimeMs = Date.now() - startTime
    const totalProcessed = successfulItems.length + failedItems.length
    const successRate = totalProcessed > 0 ? (successfulItems.length / totalProcessed) * 100 : 0

    return {
      successfulItems,
      failedItems: failedItems as unknown as { item: T; error: Error }[],
      totalProcessed,
      successRate,
      processingTimeMs
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: ID, data: Partial<T>, options: QueryBuilderOptions = {}): Promise<T | null> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ')

    const sql = `
      UPDATE ${this.getTable()}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE ${this.getPrimaryKey()} = $${keys.length + 1}
      RETURNING *
    `

    const params = [...values, id]
    const results = await this.db.query<T>(sql, params)
    return results[0] || null
  }

  /**
   * Update multiple entities by criteria
   */
  async updateMany(criteria: Partial<T>, data: Partial<T>, options: QueryBuilderOptions = {}): Promise<number> {
    const { clause: whereClause, params: whereParams } = this.buildWhereClause(criteria)

    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ')

    const sql = `
      UPDATE ${this.getTable()}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      ${whereClause}
    `

    const params = [...values, ...whereParams]
    const results = await this.db.query<{ rowCount: number }>(sql, params)
    return results[0]?.rowCount || 0
  }

  /**
   * Delete entity by ID
   */
  async delete(id: ID, options: QueryBuilderOptions = {}): Promise<boolean> {
    const sql = `DELETE FROM ${this.getTable()} WHERE ${this.getPrimaryKey()} = $1`
    const results = await this.db.query<{ rowCount: number }>(sql, [id])
    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Delete multiple entities by criteria
   */
  async deleteMany(criteria: Partial<T>, options: QueryBuilderOptions = {}): Promise<number> {
    const { clause: whereClause, params } = this.buildWhereClause(criteria)

    const sql = `DELETE FROM ${this.getTable()} ${whereClause}`
    const results = await this.db.query<{ rowCount: number }>(sql, params)
    return results[0]?.rowCount || 0
  }

  /**
   * Count entities by criteria
   */
  async count(criteria?: Partial<T>, options: QueryBuilderOptions = {}): Promise<number> {
    const { clause: whereClause, params } = this.buildWhereClause(criteria || {})

    const sql = `SELECT COUNT(*) as count FROM ${this.getTable()} ${whereClause}`
    const results = await this.db.query<{ count: number }>(sql, params)
    return results[0]?.count || 0
  }

  /**
   * Check if entity exists by criteria
   */
  async exists(criteria: Partial<T>, options: QueryBuilderOptions = {}): Promise<boolean> {
    const count = await this.count(criteria, options)
    return count > 0
  }

  /**
   * Execute raw query
   */
  async query<R = any>(sql: string, params?: any[], options: QueryBuilderOptions = {}): Promise<R[]> {
    // Add query comment if enabled
    if (options.enableQueryComments) {
      const comment = `/* ${this.getTable()} repository query */`
      sql = `${comment} ${sql}`
    }

    return this.db.query<R>(sql, params)
  }

  /**
   * Execute raw query with single result
   */
  async queryOne<R = any>(sql: string, params?: any[], options: QueryBuilderOptions = {}): Promise<R | null> {
    const results = await this.query<R>(sql, params, { ...options, limit: 1 })
    return results[0] || null
  }

  /**
   * Get table statistics
   */
  async getStats(): Promise<{ totalRows: number; tableSize: string; lastAnalyzed: Date | null }> {
    const sql = `
      SELECT
        COUNT(*) as total_rows,
        pg_size_pretty(pg_total_relation_size('${this.getTable()}')) as table_size,
        (SELECT last_analyze FROM pg_stat_user_tables WHERE relname = '${this.getTable()}') as last_analyzed
    `

    const results = await this.query(sql)
    return results[0] || { totalRows: 0, tableSize: '0 B', lastAnalyzed: null }
  }
}

/**
 * Repository factory for creating typed repositories
 */
export abstract class RepositoryFactory {
  /**
   * Create repository instance with proper typing
   */
  static create<T, ID = string>(
    db: DatabaseClient,
    tableName: string,
    primaryKey: string = 'id'
  ): IBaseRepository<T, ID> {
    return new (class extends BaseRepository<T, ID> {
      constructor() {
        super(db, tableName, primaryKey)
      }
    })()
  }
}

/**
 * Transaction-aware repository mixin
 */
export function WithTransaction<T extends new (...args: any[]) => BaseRepository<any, any>>(Base: T) {
  return class extends Base {
    /**
     * Execute operation within transaction
     */
    async withTransaction<R>(
      operation: (repo: this) => Promise<R>
    ): Promise<R> {
      return this.db.transaction(async (client) => {
        const transactionalRepo = new Base(client)
        return operation(transactionalRepo as this)
      })
    }
  }
}