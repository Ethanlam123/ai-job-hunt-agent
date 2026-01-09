/**
 * Application Configuration Management
 *
 * Centralized configuration system for all application settings,
 * eliminating magic numbers and providing environment-specific
 * configurations with validation and type safety.
 */

import { z } from 'zod'

/**
 * Environment-specific configuration schema
 */
const EnvironmentConfigSchema = z.object({
  /** Application environment */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Server configuration */
  PORT: z.coerce.number().min(1000).max(65535).default(3000),
  HOST: z.string().default('localhost'),

  /** Supabase configuration */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  /** Database configuration */
  DATABASE_URL: z.string().url().optional(),

  /** API Keys */
  OPENROUTER_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),

  /** Optional services */
  TAVILY_API_KEY: z.string().optional(),
  LANGCHAIN_API_KEY: z.string().optional(),

  /** Feature flags */
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  ENABLE_ERROR_REPORTING: z.coerce.boolean().default(false),
  ENABLE_PERFORMANCE_MONITORING: z.coerce.boolean().default(true),

  /** Rate limiting */
  RATE_LIMIT_GLOBAL_REQUESTS: z.coerce.number().min(1).default(100),
  RATE_LIMIT_GLOBAL_WINDOW: z.coerce.number().min(1).default(60),
  RATE_LIMIT_AUTH_REQUESTS: z.coerce.number().min(1).default(10),
  RATE_LIMIT_AUTH_WINDOW: z.coerce.number().min(1).default(60),

  /** File upload limits */
  MAX_FILE_SIZE_MB: z.coerce.number().min(1).max(100).default(10),
  MAX_FILES_PER_USER: z.coerce.number().min(1).default(50),

  /** Pagination */
  DEFAULT_PAGE_SIZE: z.coerce.number().min(1).max(100).default(20),
  MAX_PAGE_SIZE: z.coerce.number().min(1).max(1000).default(100),

  /** Session configuration */
  SESSION_TIMEOUT_MINUTES: z.coerce.number().min(5).default(1440), // 24 hours
  MAX_LOGIN_ATTEMPTS: z.coerce.number().min(1).default(5),
  ACCOUNT_LOCKOUT_MINUTES: z.coerce.number().min(1).default(15),

  /** AI/LLM configuration */
  AI_MAX_TOKENS: z.coerce.number().min(100).max(8000).default(4000),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  AI_MAX_RETRIES: z.coerce.number().min(1).default(3),
  AI_TIMEOUT_MS: z.coerce.number().min(5000).default(60000),

  /** Cache configuration */
  CACHE_TTL_USER_PROFILE: z.coerce.number().min(60).default(3600), // 1 hour
  CACHE_TTL_DOCUMENT_METADATA: z.coerce.number().min(60).default(1800), // 30 minutes
  CACHE_TTL_SEARCH_RESULTS: z.coerce.number().min(60).default(900), // 15 minutes
  CACHE_TTL_RATE_LIMITS: z.coerce.number().min(30).default(60), // 1 minute

  /** Performance thresholds */
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().min(100).default(1000),
  MAX_DB_CONNECTIONS: z.coerce.number().min(5).default(50),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().min(1000).default(10000),

  /** Security settings */
  PASSWORD_MIN_LENGTH: z.coerce.number().min(6).max(128).default(8),
  PASSWORD_MAX_LENGTH: z.coerce.number().min(6).max(1024).default(128),
  COOKIE_SECURE: z.coerce.boolean().default(true),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),

  /** Monitoring and logging */
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_QUERY_LOGGING: z.coerce.boolean().default(false),
  METRICS_COLLECTION_INTERVAL_MS: z.coerce.number().min(10000).default(60000), // 1 minute
})

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>

/**
 * File type configuration
 */
export const FILE_TYPES = {
  /** Allowed MIME types for file uploads */
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
  ] as const,

  /** File type icons */
  ICONS: {
    'application/pdf': '📄',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'text/plain': '📄',
    'text/markdown': '📝',
    'text/x-markdown': '📝',
  } as const,

  /** File type display names */
  DISPLAY_NAMES: {
    'application/pdf': 'PDF Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'text/plain': 'Text File',
    'text/markdown': 'Markdown File',
    'text/x-markdown': 'Markdown File',
  } as const,

  /** File extensions */
  EXTENSIONS: {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'text/x-markdown': ['.md'],
  } as const,
} as const

/**
 * Error codes and messages
 */
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',

  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // File handling errors
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  FILE_PROCESSING_ERROR: 'FILE_PROCESSING_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  BUCKET_NOT_FOUND: 'BUCKET_NOT_FOUND',
} as const

/**
 * Error messages (user-friendly)
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [ERROR_CODES.USER_NOT_FOUND]: 'User account not found. Please check your email or sign up.',
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists. Please sign in.',
  [ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token. Please sign in again.',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ERROR_CODES.ACCOUNT_LOCKED]: 'Account locked due to too many failed attempts. Please try again later.',
  [ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many attempts. Please wait before trying again.',

  [ERROR_CODES.UNAUTHORIZED]: 'You must be signed in to access this resource.',
  [ERROR_CODES.FORBIDDEN]: 'You do not have permission to access this resource.',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Your account does not have sufficient permissions.',

  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided. Please check your data and try again.',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing. Please complete all required fields.',
  [ERROR_CODES.INVALID_EMAIL_FORMAT]: 'Please enter a valid email address.',
  [ERROR_CODES.PASSWORD_TOO_WEAK]: 'Password does not meet security requirements.',
  [ERROR_CODES.FILE_TOO_LARGE]: `File size exceeds the maximum allowed size.`,
  [ERROR_CODES.INVALID_FILE_TYPE]: 'This file type is not supported. Please upload a PDF, DOCX, TXT, or Markdown file.',

  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.ALREADY_EXISTS]: 'A resource with this identifier already exists.',
  [ERROR_CODES.RESOURCE_LIMIT_EXCEEDED]: 'You have exceeded the resource limit.',

  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
  [ERROR_CODES.DATABASE_ERROR]: 'Database operation failed. Please try again.',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service is temporarily unavailable. Please try again.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',

  [ERROR_CODES.UPLOAD_FAILED]: 'File upload failed. Please try again.',
  [ERROR_CODES.FILE_PROCESSING_ERROR]: 'Failed to process file. Please ensure it is not corrupted.',
  [ERROR_CODES.STORAGE_ERROR]: 'Storage operation failed. Please try again.',
  [ERROR_CODES.BUCKET_NOT_FOUND]: 'Storage bucket not found. Please contact support.',
} as const

/**
 * Application constants
 */
export const APP_CONSTANTS = {
  /** Application metadata */
  APP_NAME: 'AI Job Hunt Agent',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'AI-powered job hunting assistant with CV analysis and interview preparation',

  /** LLM Model constants */
  LLM_MODELS: {
    DEFAULT: 'openai/gpt-5-nano',
    FALLBACK: 'openai/gpt-4o-mini',
    EMBEDDINGS: 'text-embedding-3-small',
    EMBEDDING_DIMENSIONS: 1536,
  } as const,

  /** Supported document types */
  SUPPORTED_DOCUMENT_TYPES: ['CV', 'Resume', 'Cover Letter', 'Job Description'] as const,

  /** Analysis types */
  ANALYSIS_TYPES: ['CV Analysis', 'Skill Gap Analysis', 'Interview Preparation', 'Cover Letter Generation'] as const,

  /** Status types */
  DOCUMENT_STATUS: ['uploaded', 'processing', 'processed', 'error'] as const,
  SESSION_STATUS: ['active', 'completed', 'abandoned'] as const,
  TASK_STATUS: ['pending', 'processing', 'completed', 'failed'] as const,

  /** UI constants */
  DEBOUNCE_DELAY_MS: 300,
  TOAST_DURATION_MS: 5000,
  MODAL_ANIMATION_DURATION_MS: 200,

  /** Date formats */
  DATE_FORMATS: {
    DISPLAY: 'MMM d, yyyy',
    SHORT: 'MM/dd/yyyy',
    ISO: 'yyyy-MM-dd',
    TIME: 'h:mm a',
    DATETIME: 'MMM d, yyyy h:mm a',
  } as const,

  /** Regular expressions */
  REGEX_PATTERNS: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD_STRENGTH: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    PHONE: /^\+?[\d\s-()]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  } as const,
} as const

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  /** Enable/disable features based on environment */
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: process.env.ENABLE_ERROR_REPORTING === 'true',
  ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',
  ENABLE_QUERY_LOGGING: process.env.NODE_ENV !== 'production',
  ENABLE_CACHING: true,
  ENABLE_RATE_LIMITING: true,
  ENABLE_FILE_UPLOADS: true,
  ENABLE_AI_FEATURES: true,

  /** Beta features */
  ENABLE_BETA_FEATURES: process.env.NODE_ENV === 'development',
  ENABLE_ADVANCED_ANALYTICS: false,
  ENABLE_COLLABORATION: false,
  ENABLE_API_ACCESS: false,
} as const

/**
 * Load and validate environment configuration
 */
function loadConfig(): EnvironmentConfig {
  try {
    const config = EnvironmentConfigSchema.parse(process.env)
    return config
  } catch (error) {
    console.error('Configuration validation failed:', error)

    // In development, show detailed error
    if (process.env.NODE_ENV === 'development') {
      console.error('Missing or invalid environment variables:')
      if (error instanceof z.ZodError) {
        error.issues.forEach(err => {
          console.error(`  ${err.path.join('.')}: ${err.message}`)
        })
      }
      throw new Error('Configuration validation failed. Please check your environment variables.')
    }

    // In production, use defaults where possible
    console.warn('Using default configuration due to validation errors')
    return EnvironmentConfigSchema.parse({})
  }
}

/**
 * Export validated configuration
 */
export const config = loadConfig()

/**
 * Configuration helpers
 */
export const isDevelopment = config.NODE_ENV === 'development'
export const isTest = config.NODE_ENV === 'test'
export const isProduction = config.NODE_ENV === 'production'

export const getApiUrl = () => {
  if (isDevelopment) {
    return `http://${config.HOST}:${config.PORT}`
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://ai-job-hunt-agent.vercel.app'
}

export const getFileSizeLimit = () => config.MAX_FILE_SIZE_MB * 1024 * 1024

export const getSessionTimeoutMs = () => config.SESSION_TIMEOUT_MINUTES * 60 * 1000

/**
 * Configuration validation for runtime checks
 */
export const validateRuntimeConfig = (): boolean => {
  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENROUTER_API_KEY',
    'OPENAI_API_KEY',
  ]

  const missingKeys = requiredKeys.filter(key => !process.env[key])

  if (missingKeys.length > 0) {
    console.error('Missing required environment variables:', missingKeys)
    return false
  }

  return true
}

/**
 * Get configuration value with fallback
 */
export function getConfigValue<K extends keyof EnvironmentConfig>(
  key: K,
  fallback?: EnvironmentConfig[K]
): EnvironmentConfig[K] {
  return config[key] ?? fallback!
}

/**
 * Type-safe configuration getter
 */
export function getFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag]
}

/**
 * Get error message for error code
 */
export function getErrorMessage(errorCode: keyof typeof ERROR_MESSAGES): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR]
}

// Validate configuration on import
if (!validateRuntimeConfig()) {
  console.warn('Some required configuration values are missing. Application may not function correctly.')
}