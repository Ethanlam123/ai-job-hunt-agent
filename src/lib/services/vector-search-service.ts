/**
 * Vector Search Service
 *
 * Optimized vector similarity search with caching, batching,
 * and performance monitoring for embedding operations.
 */

import { OpenAI } from 'openai'
import { VectorSearchResult, BatchOperationOptions, BatchOperationResult } from '@/lib/types/database'
import { databaseService } from '@/lib/services/database-service'
import { vectorSearchConfig } from '@/lib/config/database'
import { logger } from '@/lib/utils/secure-logger'
import { CacheService } from '@/lib/services/cache-service'

export interface EmbeddingOptions {
  /** Model to use for embeddings */
  model?: string
  /** Dimensions for the embedding vector */
  dimensions?: number
  /** Use cached embeddings if available */
  useCache?: boolean
  /** Cache TTL in seconds */
  cacheTtl?: number
}

export interface SearchOptions {
  /** Number of results to return */
  limit?: number
  /** Minimum similarity threshold (0-1) */
  threshold?: number
  /** Additional WHERE clauses */
  whereClause?: string
  /** Columns to select */
  selectColumns?: string[]
  /** Use cached results if available */
  useCache?: boolean
  /** Cache TTL in seconds */
  cacheTtl?: number
}

export interface EmbeddingJob {
  id: string
  text: string
  metadata?: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  embedding?: number[]
  error?: string
  createdAt: Date
  completedAt?: Date
}

export class VectorSearchService {
  private openai: OpenAI
  private cacheService: CacheService
  private embeddingCache = new Map<string, number[]>()
  private processingJobs = new Map<string, EmbeddingJob>()

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.cacheService = new CacheService(databaseService as any)
  }

  /**
   * Generate embedding for text with caching
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const {
      model = 'text-embedding-3-small',
      dimensions = 1536,
      useCache = true,
      cacheTtl = 3600, // 1 hour
    } = options

    try {
      // Check cache first
      if (useCache) {
        const cacheKey = `embedding:${this.hashText(text)}:${model}`
        const cached = await this.cacheService.get(cacheKey)

        if (cached) {
          logger.debug('Embedding cache hit', { textLength: text.length })
          return cached as number[]
        }
      }

      // Generate embedding
      const startTime = Date.now()
      const response = await this.openai.embeddings.create({
        model,
        input: text,
        dimensions,
      })

      const embedding = response.data[0].embedding
      const generationTime = Date.now() - startTime

      // Cache the result
      if (useCache && embedding) {
        const cacheKey = `embedding:${this.hashText(text)}:${model}`
        await this.cacheService.set(cacheKey, embedding, undefined, cacheTtl)
      }

      logger.debug('Embedding generated', {
        textLength: text.length,
        dimensions,
        generationTime,
        model,
      })

      return embedding

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Embedding generation failed', {
        textLength: text.length,
        model,
        error: errorMessage,
      })
      throw new Error(`Failed to generate embedding: ${errorMessage}`)
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: EmbeddingOptions & BatchOperationOptions = { batchSize: 100 }
  ): Promise<BatchOperationResult<{ text: string; embedding: number[] }>> {
    const {
      batchSize = vectorSearchConfig.batchSize,
      batchDelayMs = 100,
      continueOnError = true,
      ...embeddingOptions
    } = options

    const items = texts.map(text => ({ text, embeddingOptions }))

    return databaseService.batchOperation(
      items as any,
      async (batch: any[]) => {
        const results = await Promise.allSettled(
          batch.map(async ({ text }: any) => {
            const embedding = await this.generateEmbedding(text, embeddingOptions)
            return { text, embedding }
          })
        )

        // Handle failed embeddings
        const failedTexts: string[] = []
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            failedTexts.push(batch[index].text)
            logger.warn('Embedding generation failed in batch', {
              text: batch[index].text.substring(0, 100),
              error: result.reason,
            })
          }
        })

        if (failedTexts.length > 0 && !continueOnError) {
          throw new Error(`Failed to generate embeddings for ${failedTexts.length} texts`)
        }
      },
      { batchSize, batchDelayMs, continueOnError }
    ) as unknown as BatchOperationResult<{ text: string; embedding: number[] }>
  }

  /**
   * Perform similarity search with optimizations
   */
  async similaritySearch(
    queryVector: number[],
    tableName: string,
    vectorColumn: string = 'embedding',
    options: SearchOptions = {}
  ): Promise<VectorSearchResult> {
    const {
      limit = vectorSearchConfig.similarityLimit,
      threshold = vectorSearchConfig.similarityThreshold,
      whereClause,
      selectColumns = ['*'],
      useCache = true,
      cacheTtl = 300, // 5 minutes
    } = options

    try {
      // Create cache key for search
      if (useCache) {
        const cacheKey = this.createSearchCacheKey(
          queryVector,
          tableName,
          vectorColumn,
          { limit, threshold, whereClause, selectColumns }
        )

        const cached = await this.cacheService.get(cacheKey)
        if (cached) {
          logger.debug('Vector search cache hit', { tableName, limit })
          return cached as VectorSearchResult
        }
      }

      // Perform search using optimized database service
      const result = await databaseService.vectorSearch(
        queryVector,
        tableName,
        vectorColumn,
        {
          limit,
          threshold,
          whereClause,
          selectColumns,
        }
      )

      // Cache the result
      if (useCache) {
        const cacheKey = this.createSearchCacheKey(
          queryVector,
          tableName,
          vectorColumn,
          { limit, threshold, whereClause, selectColumns }
        )
        await this.cacheService.set(cacheKey, result, undefined, cacheTtl)
      }

      logger.debug('Vector search completed', {
        tableName,
        resultCount: result.records.length,
        searchTime: result.metadata.searchTimeMs,
        threshold,
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Vector search failed', {
        tableName,
        vectorColumn,
        limit,
        threshold,
        error: errorMessage,
      })
      throw new Error(`Vector search failed: ${errorMessage}`)
    }
  }

  /**
   * Find similar documents based on text content
   */
  async findSimilarDocuments(
    queryText: string,
    tableName: string,
    options: SearchOptions & EmbeddingOptions = {}
  ): Promise<VectorSearchResult> {
    try {
      // Generate embedding for query text
      const queryVector = await this.generateEmbedding(queryText, {
        useCache: true,
        ...options,
      })

      // Perform similarity search
      return this.similaritySearch(queryVector, tableName, 'embedding', options)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Similar document search failed', {
        tableName,
        queryLength: queryText.length,
        error: errorMessage,
      })
      throw error
    }
  }

  /**
   * Create embedding job for async processing
   */
  async createEmbeddingJob(
    text: string,
    metadata?: Record<string, any>
  ): Promise<EmbeddingJob> {
    const job: EmbeddingJob = {
      id: this.generateJobId(),
      text,
      metadata,
      status: 'pending',
      createdAt: new Date(),
    }

    this.processingJobs.set(job.id, job)

    // Process embedding asynchronously
    this.processEmbeddingJob(job.id).catch(error => {
      logger.error('Async embedding job failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    })

    return job
  }

  /**
   * Get embedding job status
   */
  getEmbeddingJob(jobId: string): EmbeddingJob | undefined {
    return this.processingJobs.get(jobId)
  }

  /**
   * Get multiple embedding jobs
   */
  getEmbeddingJobs(jobIds: string[]): EmbeddingJob[] {
    return jobIds
      .map(id => this.processingJobs.get(id))
      .filter((job): job is EmbeddingJob => job !== undefined)
  }

  /**
   * Delete embedding job
   */
  deleteEmbeddingJob(jobId: string): boolean {
    return this.processingJobs.delete(jobId)
  }

  /**
   * Process embedding job asynchronously
   */
  private async processEmbeddingJob(jobId: string): Promise<void> {
    const job = this.processingJobs.get(jobId)
    if (!job) return

    try {
      job.status = 'processing'

      const embedding = await this.generateEmbedding(job.text, {
        useCache: true,
      })

      job.embedding = embedding
      job.status = 'completed'
      job.completedAt = new Date()

      logger.debug('Embedding job completed', {
        jobId,
        textLength: job.text.length,
      })

    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Embedding job failed', {
        jobId,
        error: job.error,
      })
    }
  }

  /**
   * Clean up completed jobs older than specified time
   */
  cleanupCompletedJobs(olderThanHours: number = 24): number {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours)

    let cleanedCount = 0
    for (const [jobId, job] of this.processingJobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt < cutoffTime
      ) {
        this.processingJobs.delete(jobId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up embedding jobs', {
        cleanedCount,
        remainingJobs: this.processingJobs.size,
      })
    }

    return cleanedCount
  }

  /**
   * Get service statistics
   */
  getStats(): {
    activeJobs: number
    completedJobs: number
    failedJobs: number
    cacheSize: number
  } {
    const jobs = Array.from(this.processingJobs.values())

    return {
      activeJobs: jobs.filter(job => job.status === 'pending' || job.status === 'processing').length,
      completedJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      cacheSize: this.embeddingCache.size,
    }
  }

  /**
   * Create cache key for search results
   */
  private createSearchCacheKey(
    vector: number[],
    tableName: string,
    vectorColumn: string,
    options: Record<string, any>
  ): string {
    const vectorHash = this.hashVector(vector)
    const optionsHash = this.hashObject(options)
    return `vector_search:${vectorHash}:${tableName}:${vectorColumn}:${optionsHash}`
  }

  /**
   * Hash text for cache keys
   */
  private hashText(text: string): string {
    // Simple hash implementation - in production use crypto
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Hash vector for cache keys
   */
  private hashVector(vector: number[]): string {
    // Use first few and last few elements for hash
    const sample = [
      ...vector.slice(0, 5),
      ...vector.slice(-5),
      vector.length,
    ]
    return this.hashText(sample.join(','))
  }

  /**
   * Hash object for cache keys
   */
  private hashObject(obj: Record<string, any>): string {
    return this.hashText(JSON.stringify(obj))
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
export const vectorSearchService = new VectorSearchService()

/**
 * Export convenience functions
 */
export const generateEmbedding = (text: string, options?: EmbeddingOptions) =>
  vectorSearchService.generateEmbedding(text, options)

export const findSimilarDocuments = (
  queryText: string,
  tableName: string,
  options?: SearchOptions & EmbeddingOptions
) => vectorSearchService.findSimilarDocuments(queryText, tableName, options)

export const createEmbeddingJob = (text: string, metadata?: Record<string, any>) =>
  vectorSearchService.createEmbeddingJob(text, metadata)