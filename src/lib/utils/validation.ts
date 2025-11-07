/**
 * Input validation utilities for security and data integrity
 *
 * This module provides comprehensive validation functions to prevent
 * authentication bypass, injection attacks, and data corruption.
 */

/**
 * Validates email format using RFC 5322 compliant regex
 * This prevents authentication bypass attempts with malformed emails
 *
 * @param email - The email address to validate
 * @returns true if email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // Trim whitespace and convert to lowercase for consistent validation
  const normalizedEmail = email.trim().toLowerCase()

  // Basic length check to prevent DoS attacks with extremely long emails
  if (normalizedEmail.length > 254) {
    return false
  }

  // RFC 5322 compliant email regex (simplified for practical use)
  // This pattern covers most valid email formats without being overly permissive
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!emailRegex.test(normalizedEmail)) {
    return false
  }

  // Additional checks for common invalid patterns
  const invalidPatterns = [
    /\.\./, // Double dots
    /^\./, // Starting with dot
    /\.$/, // Ending with dot
    /^[^@]*@.*@/, // Multiple @ symbols
  ]

  return !invalidPatterns.some(pattern => pattern.test(normalizedEmail))
}

/**
 * Validates password strength according to security requirements
 *
 * @param password - The password to validate
 * @returns Validation result with error messages
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!password || typeof password !== 'string') {
    errors.push('Password is required')
    return { isValid: false, errors }
  }

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long')
  }

  // Check for common weak patterns
  const weakPatterns = [
    /^(.)\1+$/, // All same character
    /^(123|password|qwerty|admin)/i, // Common passwords
  ]

  if (weakPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password is too common and easily guessable')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitizes user input to prevent injection attacks
 *
 * @param input - The user input to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeInput(
  input: string,
  options: {
    maxLength?: number
    allowHtml?: boolean
    trim?: boolean
  } = {}
): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  const {
    maxLength = 1000,
    allowHtml = false,
    trim = true
  } = options

  let sanitized = input

  // Remove null bytes and control characters (except common whitespace)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  if (!allowHtml) {
    // Remove HTML tags to prevent XSS
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }

  // Remove potential SQL injection patterns (additional layer of protection)
  const sqlPatterns = [
    /('|(\\')|(;)|(\-\-)|(\s+(OR|AND)\s+.*=.*(\s|;|$)))/gi,
    /(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)/gi
  ]

  sanitized = sqlPatterns.reduce((str, pattern) =>
    str.replace(pattern, ''), sanitized
  )

  if (trim) {
    sanitized = sanitized.trim()
  }

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Validates and sanitizes form data for authentication
 *
 * @param formData - FormData object from login/signup forms
 * @returns Validated and sanitized data with error messages
 */
export function validateAuthFormData(formData: FormData): {
  isValid: boolean
  data: {
    email: string
    password: string
    confirmPassword?: string
  }
  errors: string[]
} {
  const errors: string[] = []

  // Extract and validate email
  const email = formData.get('email') as string
  const sanitizedEmail = sanitizeInput(email?.trim() || '', { maxLength: 254 })

  if (!validateEmail(sanitizedEmail)) {
    errors.push('Please enter a valid email address')
  }

  // Extract and validate password
  const password = formData.get('password') as string
  const passwordValidation = validatePassword(password)

  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors)
  }

  // Extract and validate confirm password (for signup)
  const confirmPassword = formData.get('confirm-password') as string
  let validatedConfirmPassword: string | undefined

  if (confirmPassword !== null) {
    if (confirmPassword !== password) {
      errors.push('Passwords do not match')
    }
    validatedConfirmPassword = sanitizeInput(confirmPassword, { maxLength: 128 })
  }

  return {
    isValid: errors.length === 0,
    data: {
      email: sanitizedEmail,
      password: password, // Keep original password for Supabase
      confirmPassword: validatedConfirmPassword
    },
    errors
  }
}

/**
 * Checks if a string contains potential malicious content
 *
 * @param input - The input to check
 * @returns true if potentially malicious content is found
 */
export function containsMaliciousContent(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload
    /expression\s*\(/gi, // CSS expressions
    /@import/gi, // CSS imports
  ]

  return maliciousPatterns.some(pattern => pattern.test(input))
}

/**
 * Rate limiting identifier generator
 * Creates a safe identifier for rate limiting based on IP or email
 *
 * @param identifier - IP address or email
 * @returns Safe identifier for rate limiting
 */
export function createRateLimitIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== 'string') {
    return 'anonymous'
  }

  // Hash the identifier to avoid storing PII in rate limit keys
  const hash = require('crypto')
    .createHash('sha256')
    .update(identifier.trim().toLowerCase())
    .digest('hex')
    .substring(0, 16) // Use first 16 chars for readability

  return `rate_limit_${hash}`
}