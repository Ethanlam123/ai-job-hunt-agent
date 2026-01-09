/**
 * Database Configuration Module
 *
 * Centralized database configuration with connection pooling,
 * performance optimizations, and environment-specific settings.
 */

import { DatabaseClient } from '@/lib/types/database'

export interface DatabaseConfig {
  /** Maximum number of connections in the pool */
  maxConnections: number
  /** Minimum number of connections to maintain */
  minConnections: number
  /** Connection timeout in milliseconds */
  connectionTimeoutMillis: number
  /** Idle timeout for connections in milliseconds */
  idleTimeoutMillis: number
  /** Maximum time a query can run before timeout */
  queryTimeoutMillis: number
  /** Number of times to retry a failed query */
  maxRetryAttempts: number
  /** Delay between retry attempts in milliseconds */
  retryDelayMillis: number
  /** Enable query performance logging */
  enableQueryLogging: boolean
  /** Slow query threshold in milliseconds */
  slowQueryThreshold: number
  /** Enable connection health checks */
  enableHealthChecks: boolean
  /** Health check interval in milliseconds */
  healthCheckInterval: number
}

export interface VectorSearchConfig {
  /** Number of similar vectors to return */
  similarityLimit: number
  /** Minimum similarity threshold (0-1) */
  similarityThreshold: number
  /** Enable vector index usage */
  useVectorIndex: boolean
  /** Index name for vector similarity search */
  indexName: string
  /** Batch size for vector operations */
  batchSize: number
  /** Enable parallel vector processing */
  enableParallelProcessing: boolean
}

export interface RateLimitConfig {
  /** Default rate limit window in seconds */
  defaultWindowSeconds: number
  /** Default rate limit count */
  defaultLimit: number
  /** Rate limit cleanup interval in seconds */
  cleanupIntervalSeconds: number
  /** Enable distributed rate limiting */
  enableDistributedLimiting: boolean
}

/**
 * Default database configuration optimized for different environments
 */
const getDatabaseConfig = (): DatabaseConfig => {
  const environment = process.env.NODE_ENV || 'development'

  const baseConfig: DatabaseConfig = {
    maxConnections: 20,
    minConnections: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    queryTimeoutMillis: 30000,
    maxRetryAttempts: 3,
    retryDelayMillis: 1000,
    enableQueryLogging: false,
    slowQueryThreshold: 1000,
    enableHealthChecks: true,
    healthCheckInterval: 60000,
  }

  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        maxConnections: 50,
        minConnections: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 60000,
        queryTimeoutMillis: 10000,
        enableQueryLogging: true,
        slowQueryThreshold: 500,
        healthCheckInterval: 30000,
      }

    case 'test':
      return {
        ...baseConfig,
        maxConnections: 5,
        minConnections: 1,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
        queryTimeoutMillis: 5000,
        enableQueryLogging: true,
        slowQueryThreshold: 200,
        healthCheckInterval: 15000,
      }

    default: // development
      return {
        ...baseConfig,
        enableQueryLogging: true,
        slowQueryThreshold: 2000,
      }
  }
}

/**
 * Vector search configuration for embedding operations
 */
export const getVectorSearchConfig = (): VectorSearchConfig => {
  const environment = process.env.NODE_ENV || 'development'

  return {
    similarityLimit: 10,
    similarityThreshold: 0.7,
    useVectorIndex: true,
    indexName: 'cv_embeddings_idx',
    batchSize: environment === 'production' ? 100 : 50,
    enableParallelProcessing: true,
  }
}

/**
 * Rate limiting configuration
 */
export const getRateLimitConfig = (): RateLimitConfig => {
  return {
    defaultWindowSeconds: 60,
    defaultLimit: 100,
    cleanupIntervalSeconds: 300, // 5 minutes
    enableDistributedLimiting: process.env.NODE_ENV === 'production',
  }
}

/**
 * Application-level constants and limits
 */
export const APP_CONFIG = {
  /** Maximum file upload size in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** Supported file MIME types */
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
  ],

  /** Pagination settings */
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  /** Cache TTL in seconds */
  CACHE_TTL: {
    USER_PROFILE: 3600,        // 1 hour
    DOCUMENT_METADATA: 1800,   // 30 minutes
    SEARCH_RESULTS: 900,       // 15 minutes
    RATE_LIMITS: 60,           // 1 minute
  },

  /** Security settings */
  SECURITY: {
    /** Maximum login attempts */
    MAX_LOGIN_ATTEMPTS: 5,
    /** Account lockout duration in minutes */
    ACCOUNT_LOCKOUT_MINUTES: 15,
    /** Session timeout in minutes */
    SESSION_TIMEOUT_MINUTES: 1440, // 24 hours
    /** Password requirements */
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
  },

  /** AI/LLM settings */
  AI_CONFIG: {
    /** Maximum tokens for LLM requests */
    MAX_TOKENS: 4000,
    /** Temperature for response generation */
    TEMPERATURE: 0.7,
    /** Maximum number of retries for AI requests */
    MAX_AI_RETRIES: 3,
    /** AI request timeout in milliseconds */
    AI_REQUEST_TIMEOUT: 60000, // 1 minute
  },
} as const

/**
 * Get database connection string with pooling parameters
 */
export const getDatabaseUrl = (): string => {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const config = getDatabaseConfig()
  const url = new URL(baseUrl)

  // Add pooling parameters as query string
  url.searchParams.set('maxPoolSize', config.maxConnections.toString())
  url.searchParams.set('minPoolSize', config.minConnections.toString())
  url.searchParams.set('connectionTimeoutMillis', config.connectionTimeoutMillis.toString())
  url.searchParams.set('idleTimeoutMillis', config.idleTimeoutMillis.toString())

  return url.toString()
}

/**
 * Supabase client configuration with performance optimizations
 */
export const getSupabaseConfig = () => {
  const config = getDatabaseConfig()

  return {
    db: {
      // Connection pooling settings
      poolSize: config.maxConnections,
      connectionTimeout: config.connectionTimeoutMillis,

      // Query performance settings
      queryTimeout: config.queryTimeoutMillis,
      retryAttempts: config.maxRetryAttempts,
      retryDelay: config.retryDelayMillis,

      // Enable performance features
      performance: {
        enableQueryLogging: config.enableQueryLogging,
        slowQueryThreshold: config.slowQueryThreshold,
        enableHealthChecks: config.enableHealthChecks,
        healthCheckInterval: config.healthCheckInterval,
      },
    },

    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },

    global: {
      headers: {
        'X-Client-Info': 'ai-job-hunt-agent/1.0.0',
      },
    },
  }
}

/**
 * Export singleton instances
 */
export const databaseConfig = getDatabaseConfig()
export const vectorSearchConfig = getVectorSearchConfig()
export const rateLimitConfig = getRateLimitConfig()
export const supabaseConfig = getSupabaseConfig()

/**
 * Configuration validation
 */
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENROUTER_API_KEY',
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }

  // Validate database URL format
  if (process.env.DATABASE_URL) {
    try {
      new URL(process.env.DATABASE_URL)
    } catch {
      throw new Error('Invalid DATABASE_URL format')
    }
  }

  // Validate numeric configuration values
  if (databaseConfig.maxConnections <= 0) {
    throw new Error('maxConnections must be greater than 0')
  }

  if (databaseConfig.connectionTimeoutMillis <= 0) {
    throw new Error('connectionTimeoutMillis must be greater than 0')
  }
}

// Validate configuration on module import
try {
  validateConfig()
} catch (error) {
  console.error('Configuration validation failed:', error)
  // In development, throw the error. In production, log but continue.
  if (process.env.NODE_ENV === 'development') {
    throw error
  }
}