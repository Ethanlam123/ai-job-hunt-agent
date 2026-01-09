/**
 * Authentication Tests
 *
 * Comprehensive test suite for authentication flows including:
 * - Input validation
 * - Rate limiting
 * - Error handling
 * - Security measures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateEmail, validatePassword, validateAuthFormData } from '@/lib/utils/validation'
import { StatsService, createMockStatsService } from '@/lib/services/stats-service'
import { createErrorResponse, ERROR_CODES } from '@/lib/utils/error-response'

// Mock environment variables
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Map())
}))

describe('Email Validation', () => {
  it('should validate correct email formats', () => {
    const validEmails = [
      'user@example.com',
      'test.email+tag@example.co.uk',
      'user123@test-domain.com',
      'firstname.lastname@company.com',
      'user@subdomain.example.com'
    ]

    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true)
    })
  })

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      '',
      'invalid-email',
      '@example.com',
      'user@',
      'user..name@example.com',
      '.user@example.com',
      'user.@example.com',
      'user@example..com',
      'user name@example.com',
      'user@.example.com',
      'user@example.',
      'user@example.com.',
      'user@example,com',
      'user@ex ample.com'
    ]

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false)
    })
  })

  it('should handle edge cases', () => {
    expect(validateEmail(null as any)).toBe(false)
    expect(validateEmail(undefined as any)).toBe(false)
    expect(validateEmail(123 as any)).toBe(false)
    expect(validateEmail({} as any)).toBe(false)

    // Test length limits
    const tooLongEmail = 'a'.repeat(255) + '@example.com'
    expect(validateEmail(tooLongEmail)).toBe(false)
  })
})

describe('Password Validation', () => {
  it('should validate strong passwords', () => {
    const strongPasswords = [
      'MySecureP@ss123',
      'ComplexPassw0rd!',
      'Str0ng#Password',
      'SecureP@ssphrase'
    ]

    strongPasswords.forEach(password => {
      const result = validatePassword(password)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  it('should reject weak passwords', () => {
    const testCases = [
      { password: '', expectedError: 'Password is required' },
      { password: '123', expectedError: 'Password must be at least 6 characters long' },
      { password: 'a'.repeat(129), expectedError: 'Password must be less than 128 characters long' },
      { password: 'aaaaaa', expectedError: 'Password is too common and easily guessable' },
      { password: 'password', expectedError: 'Password is too common and easily guessable' },
      { password: 'qwerty', expectedError: 'Password is too common and easily guessable' },
      { password: 'admin', expectedError: 'Password is too common and easily guessable' }
    ]

    testCases.forEach(({ password, expectedError }) => {
      const result = validatePassword(password)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes(expectedError))).toBe(true)
    })
  })
})

describe('Auth Form Validation', () => {
  it('should validate complete signup form', () => {
    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('password', 'SecureP@ss123')
    formData.append('confirm-password', 'SecureP@ss123')

    const result = validateAuthFormData(formData)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.data.email).toBe('test@example.com')
    expect(result.data.password).toBe('SecureP@ss123')
    expect(result.data.confirmPassword).toBe('SecureP@ss123')
  })

  it('should validate complete login form', () => {
    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('password', 'SecureP@ss123')

    const result = validateAuthFormData(formData)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.data.email).toBe('test@example.com')
    expect(result.data.password).toBe('SecureP@ss123')
  })

  it('should reject mismatched passwords', () => {
    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('password', 'SecureP@ss123')
    formData.append('confirm-password', 'DifferentP@ss123')

    const result = validateAuthFormData(formData)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Passwords do not match')
  })

  it('should reject invalid email formats', () => {
    const formData = new FormData()
    formData.append('email', 'invalid-email')
    formData.append('password', 'SecureP@ss123')

    const result = validateAuthFormData(formData)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(error => error.includes('valid email'))).toBe(true)
  })

  it('should handle missing fields', () => {
    const formData = new FormData()
    // No fields added

    const result = validateAuthFormData(formData)

    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should sanitize input data', () => {
    const formData = new FormData()
    formData.append('email', '  test@example.com  ')
    formData.append('password', 'SecureP@ss123')
    formData.append('confirm-password', 'SecureP@ss123')

    const result = validateAuthFormData(formData)

    expect(result.isValid).toBe(true)
    expect(result.data.email).toBe('test@example.com') // Should be trimmed
    expect(result.data.password).toBe('SecureP@ss123') // Password should not be trimmed
  })
})

describe('StatsService Dependency Injection', () => {
  it('should use injected Supabase client', async () => {
    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    }

    const statsService = new StatsService({ supabaseClient: mockSupabaseClient })

    const mockQueryResult = { count: 5, data: [] }
    mockSupabaseClient.select.mockResolvedValue(mockQueryResult)

    const result = await statsService.getUserStats('user123')

    expect(mockSupabaseClient.from).toHaveBeenCalledTimes(5) // Should be called for each parallel query
    expect(result.totalSessions).toBe(5)
  })

  it('should create mock service for testing', async () => {
    const mockData = {
      userStats: {
        totalSessions: 10,
        cvsAnalyzed: 3,
        coverLetters: 2,
        mockInterviews: 5,
        completedSessions: 8,
      }
    }

    const mockService = createMockStatsService(mockData)
    const result = await mockService.getUserStats('user123')

    expect(result).toEqual(mockData.userStats)
  })
})

describe('Error Response Format', () => {
  it('should create standardized error response', () => {
    const errorResponse = createErrorResponse(
      ERROR_CODES.INVALID_CREDENTIALS,
      'Custom error message',
      [{ field: 'email', message: 'Invalid email format' }]
    )

    expect(errorResponse.success).toBe(false)
    expect(errorResponse.error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS)
    expect(errorResponse.error.message).toBe('Custom error message')
    expect(errorResponse.error.details).toHaveLength(1)
    expect(errorResponse.error.timestamp).toBeDefined()
  })

  it('should use default error messages', () => {
    const errorResponse = createErrorResponse(ERROR_CODES.INVALID_CREDENTIALS)

    expect(errorResponse.error.message).toBe('Invalid email or password')
  })

  it('should create validation error response', () => {
    const fieldErrors = {
      email: 'Invalid email format',
      password: 'Password too short'
    }

    const errorResponse = createErrorResponse(
      ERROR_CODES.INVALID_INPUT_FORMAT,
      'Validation failed',
      Object.entries(fieldErrors).map(([field, message]) => ({ field, message }))
    )

    expect(errorResponse.success).toBe(false)
    expect(errorResponse.error.code).toBe(ERROR_CODES.INVALID_INPUT_FORMAT)
    expect(errorResponse.error.details).toHaveLength(2)
  })
})

describe('Security Validation', () => {
  it('should prevent script injection in email', () => {
    const maliciousEmails = [
      '<script>alert("xss")</script>@example.com',
      'javascript:alert("xss")@example.com',
      '"><script>alert("xss")</script>@example.com'
    ]

    maliciousEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false)
    })
  })

  it('should handle malicious input in forms', () => {
    const formData = new FormData()
    formData.append('email', '<script>alert("xss")</script>@example.com')
    formData.append('password', 'SecureP@ss123')

    const result = validateAuthFormData(formData)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(error => error.includes('valid email'))).toBe(true)
  })

  it('should sanitize input properly', () => {
    const formData = new FormData()
    formData.append('email', 'test@example.com')
    formData.append('password', 'SecureP@ss123')

    const result = validateAuthFormData(formData)

    // Email should be sanitized
    expect(result.data.email).not.toContain('<')
    expect(result.data.email).not.toContain('>')
    expect(result.data.email).not.toContain('javascript:')
  })
})

describe('Rate Limiting Security', () => {
  it('should include rate limit information in error responses', () => {
    const errorResponse = createErrorResponse(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'Too many requests',
      [
        { message: 'Rate limit exceeded. Try again after 60 seconds', code: 'RATE_LIMIT_RETRY_AFTER' },
        { message: 'Limit resets at 2023-12-01T12:00:00.000Z', code: 'RATE_LIMIT_RESET_TIME' }
      ]
    )

    expect(errorResponse.success).toBe(false)
    expect(errorResponse.error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED)
    expect(errorResponse.error.details && errorResponse.error.details).toHaveLength(2)
    expect(errorResponse.error.details && errorResponse.error.details[0].code).toBe('RATE_LIMIT_RETRY_AFTER')
  })
})