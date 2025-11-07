/**
 * Standardized Error Response Utilities
 *
 * Provides consistent error response formatting across the application
 * for better debugging, user experience, and security
 */

export interface ErrorDetail {
  field?: string
  message: string
  code?: string
}

export interface StandardError {
  success: false
  error: {
    code: string
    message: string
    details?: ErrorDetail[]
    timestamp: string
    requestId?: string
  }
}

export interface StandardSuccess<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
  requestId?: string
}

export type StandardResponse<T = any> = StandardSuccess<T> | StandardError

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication errors (1000-1099)
  INVALID_CREDENTIALS: 'AUTH_1001',
  USER_NOT_FOUND: 'AUTH_1002',
  EMAIL_ALREADY_EXISTS: 'AUTH_1003',
  INVALID_EMAIL_FORMAT: 'AUTH_1004',
  PASSWORD_TOO_WEAK: 'AUTH_1005',
  PASSWORDS_DO_NOT_MATCH: 'AUTH_1006',
  EMAIL_NOT_VERIFIED: 'AUTH_1007',
  ACCOUNT_LOCKED: 'AUTH_1008',
  SESSION_EXPIRED: 'AUTH_1009',
  RATE_LIMIT_EXCEEDED: 'AUTH_1010',

  // Validation errors (1100-1199)
  REQUIRED_FIELD_MISSING: 'VALIDATION_1101',
  INVALID_INPUT_FORMAT: 'VALIDATION_1102',
  INPUT_TOO_LONG: 'VALIDATION_1103',
  INPUT_TOO_SHORT: 'VALIDATION_1104',
  INVALID_FILE_TYPE: 'VALIDATION_1105',
  FILE_TOO_LARGE: 'VALIDATION_1106',

  // Database errors (1200-1299)
  DATABASE_CONNECTION_ERROR: 'DB_1201',
  RECORD_NOT_FOUND: 'DB_1202',
  DUPLICATE_RECORD: 'DB_1203',
  FOREIGN_KEY_VIOLATION: 'DB_1204',
  DATABASE_TIMEOUT: 'DB_1205',

  // Business logic errors (1300-1399)
  INSUFFICIENT_PERMISSIONS: 'BIZ_1301',
  RESOURCE_LIMIT_EXCEEDED: 'BIZ_1302',
  OPERATION_NOT_ALLOWED: 'BIZ_1303',
  QUOTA_EXCEEDED: 'BIZ_1304',

  // System errors (1400-1499)
  INTERNAL_SERVER_ERROR: 'SYS_1401',
  SERVICE_UNAVAILABLE: 'SYS_1402',
  NETWORK_ERROR: 'SYS_1403',
  TIMEOUT: 'SYS_1404',
  CONFIGURATION_ERROR: 'SYS_1405',

  // External service errors (1500-1599)
  EXTERNAL_API_ERROR: 'EXT_1501',
  PAYMENT_REQUIRED: 'EXT_1502',
  EXTERNAL_SERVICE_TIMEOUT: 'EXT_1503',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

/**
 * Error message mapping for user-friendly messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.USER_NOT_FOUND]: 'User account not found',
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists',
  [ERROR_CODES.INVALID_EMAIL_FORMAT]: 'Please enter a valid email address',
  [ERROR_CODES.PASSWORD_TOO_WEAK]: 'Password is too weak. Please choose a stronger password',
  [ERROR_CODES.PASSWORDS_DO_NOT_MATCH]: 'Passwords do not match',
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: 'Please verify your email address',
  [ERROR_CODES.ACCOUNT_LOCKED]: 'Account has been locked due to too many failed attempts',
  [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many attempts. Please try again later',

  [ERROR_CODES.REQUIRED_FIELD_MISSING]: 'Required field is missing',
  [ERROR_CODES.INVALID_INPUT_FORMAT]: 'Invalid input format',
  [ERROR_CODES.INPUT_TOO_LONG]: 'Input is too long',
  [ERROR_CODES.INPUT_TOO_SHORT]: 'Input is too short',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File is too large',

  [ERROR_CODES.DATABASE_CONNECTION_ERROR]: 'Database connection error',
  [ERROR_CODES.RECORD_NOT_FOUND]: 'Record not found',
  [ERROR_CODES.DUPLICATE_RECORD]: 'Record already exists',
  [ERROR_CODES.FOREIGN_KEY_VIOLATION]: 'Referenced record does not exist',
  [ERROR_CODES.DATABASE_TIMEOUT]: 'Database operation timed out',

  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ERROR_CODES.RESOURCE_LIMIT_EXCEEDED]: 'Resource limit exceeded',
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'Operation not allowed',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Quota exceeded',

  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error occurred',
  [ERROR_CODES.TIMEOUT]: 'Operation timed out',
  [ERROR_CODES.CONFIGURATION_ERROR]: 'Configuration error',

  [ERROR_CODES.EXTERNAL_API_ERROR]: 'External service error',
  [ERROR_CODES.PAYMENT_REQUIRED]: 'Payment required',
  [ERROR_CODES.EXTERNAL_SERVICE_TIMEOUT]: 'External service timeout',
}

/**
 * Creates a standardized error response
 *
 * @param code - Error code from ERROR_CODES
 * @param message - Custom error message (optional, will use default if not provided)
 * @param details - Additional error details (optional)
 * @param requestId - Request identifier for tracing (optional)
 * @returns Standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  details?: ErrorDetail[],
  requestId?: string
): StandardError {
  return {
    success: false,
    error: {
      code,
      message: message || ERROR_MESSAGES[code],
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}

/**
 * Creates a standardized success response
 *
 * @param data - Response data
 * @param message - Success message (optional)
 * @param requestId - Request identifier for tracing (optional)
 * @returns Standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): StandardSuccess<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId,
  }
}

/**
 * Creates a validation error response
 *
 * @param fieldErrors - Object mapping field names to error messages
 * @param requestId - Request identifier for tracing (optional)
 * @returns Standardized validation error response
 */
export function createValidationErrorResponse(
  fieldErrors: Record<string, string>,
  requestId?: string
): StandardError {
  const details: ErrorDetail[] = Object.entries(fieldErrors).map(([field, message]) => ({
    field,
    message,
    code: ERROR_CODES.REQUIRED_FIELD_MISSING,
  }))

  return createErrorResponse(
    ERROR_CODES.INVALID_INPUT_FORMAT,
    'Validation failed',
    details,
    requestId
  )
}

/**
 * Creates a rate limit error response
 *
 * @param resetTime - When the rate limit resets
 * @param retryAfter - Seconds to wait before retrying
 * @param requestId - Request identifier for tracing (optional)
 * @returns Standardized rate limit error response
 */
export function createRateLimitErrorResponse(
  resetTime: Date,
  retryAfter: number,
  requestId?: string
): StandardError {
  const details: ErrorDetail[] = [
    {
      message: `Rate limit exceeded. Try again after ${retryAfter} seconds`,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
    },
    {
      message: `Limit resets at ${resetTime.toISOString()}`,
      code: 'RATE_LIMIT_RESET_TIME',
    },
  ]

  return createErrorResponse(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    'Too many requests. Please try again later.',
    details,
    requestId
  )
}

/**
 * Handles different error types and converts them to standard error responses
 *
 * @param error - The error to handle
 * @param requestId - Request identifier for tracing (optional)
 * @returns Standardized error response
 */
export function handleError(error: any, requestId?: string): StandardError {
  // Log the full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', error)
  } else {
    // Log minimal information in production
    console.error('Error occurred:', {
      message: error?.message || 'Unknown error',
      code: error?.code,
      requestId,
    })
  }

  // Handle Supabase auth errors
  if (error?.code?.startsWith('auth/')) {
    const authErrorMap: Record<string, ErrorCode> = {
      'auth/invalid-email': ERROR_CODES.INVALID_EMAIL_FORMAT,
      'auth/invalid-password': ERROR_CODES.INVALID_CREDENTIALS,
      'auth/user-not-found': ERROR_CODES.USER_NOT_FOUND,
      'auth/email-already-in-use': ERROR_CODES.EMAIL_ALREADY_EXISTS,
      'auth/weak-password': ERROR_CODES.PASSWORD_TOO_WEAK,
      'auth/too-many-requests': ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'auth/user-disabled': ERROR_CODES.ACCOUNT_LOCKED,
      'auth/session-expired': ERROR_CODES.SESSION_EXPIRED,
    }

    const errorCode = authErrorMap[error.code] || ERROR_CODES.INVALID_CREDENTIALS
    return createErrorResponse(errorCode, error.message, undefined, requestId)
  }

  // Handle validation errors
  if (error?.name === 'ValidationError') {
    return createValidationErrorResponse(error.details || {}, requestId)
  }

  // Handle rate limit errors
  if (error?.code === ERROR_CODES.RATE_LIMIT_EXCEEDED) {
    return createRateLimitErrorResponse(
      error.resetTime || new Date(Date.now() + 60000),
      error.retryAfter || 60,
      requestId
    )
  }

  // Handle database errors
  if (error?.code?.startsWith('PGRST') || error?.code?.startsWith('22P')) {
    return createErrorResponse(ERROR_CODES.DATABASE_CONNECTION_ERROR, 'Database error occurred', undefined, requestId)
  }

  // Default to internal server error
  return createErrorResponse(
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error?.message || 'Unknown error occurred',
    undefined,
    requestId
  )
}

/**
 * Checks if a response is an error response
 *
 * @param response - Response to check
 * @returns True if response is an error response
 */
export function isError<T>(response: StandardResponse<T>): response is StandardError {
  return response.success === false
}

/**
 * Checks if a response is a success response
 *
 * @param response - Response to check
 * @returns True if response is a success response
 */
export function isSuccess<T>(response: StandardResponse<T>): response is StandardSuccess<T> {
  return response.success === true
}

/**
 * Extracts data from a success response or throws an error if it's an error response
 *
 * @param response - Response to extract data from
 * @returns Data from success response
 * @throws Error if response is an error response
 */
export function extractData<T>(response: StandardResponse<T>): T {
  if (isError(response)) {
    throw new Error(response.error.message)
  }
  return response.data
}