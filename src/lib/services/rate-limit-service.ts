/**
 * RateLimitService
 *
 * PostgreSQL-based rate limiting using sliding window algorithm
 * Tracks requests per identifier (IP address or user ID) within a time window
 * Uses Supabase for database operations to maintain consistency with the rest of the application
 */

import { createClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
  error?: string
}

export interface RateLimitOptions {
  limit: number // Maximum requests allowed
  window: number // Time window in seconds
}

export class RateLimitService {
  /**
   * Check if a request is within rate limits
   * @param identifier - Unique identifier (IP address or user ID)
   * @param limit - Maximum requests allowed (default: 10)
   * @param window - Time window in seconds (default: 60)
   * @returns Rate limit result
   */
  async checkLimit(
    identifier: string,
    limit: number = 10,
    window: number = 60
  ): Promise<RateLimitResult> {
    const supabase = await createClient()
    const now = new Date()
    const windowStart = new Date(now.getTime() - window * 1000)

    try {
      // Count requests within the window
      const { data: requests, error: countError } = await supabase
        .from('rate_limits')
        .select('id')
        .eq('identifier', identifier)
        .gte('created_at', windowStart.toISOString())

      if (countError) {
        console.error('Rate limit check failed:', countError)
        // Fail open - allow request if rate limiting fails
        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: new Date(now.getTime() + window * 1000),
          error: 'Rate limit service unavailable'
        }
      }

      const requestCount = requests?.length || 0
      const remaining = Math.max(0, limit - requestCount - 1)
      const reset = new Date(now.getTime() + window * 1000)

      // Check if limit exceeded
      if (requestCount >= limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset,
        }
      }

      // Record this request
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          identifier,
          created_at: now.toISOString(),
        })

      if (insertError) {
        console.error('Failed to record rate limit request:', insertError)
        // Don't fail the request, just log the error
      }

      return {
        success: true,
        limit,
        remaining,
        reset,
      }

    } catch (error) {
      console.error('Rate limit service error:', error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: new Date(now.getTime() + window * 1000),
        error: 'Rate limit service error'
      }
    }
  }

  /**
   * Clean up old rate limit records
   * Should be run periodically to prevent table bloat
   * @param olderThan - Delete records older than this many seconds (default: 3600 = 1 hour)
   */
  async cleanup(olderThan: number = 3600): Promise<void> {
    const supabase = await createClient()
    const cutoffDate = new Date(Date.now() - olderThan * 1000)

    try {
      await supabase
        .from('rate_limits')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
    } catch (error) {
      console.error('Failed to cleanup rate limits:', error)
    }
  }

  /**
   * Get current rate limit status without incrementing
   * @param identifier - Unique identifier (IP address or user ID)
   * @param limit - Maximum requests allowed
   * @param window - Time window in seconds
   */
  async getStatus(
    identifier: string,
    limit: number = 10,
    window: number = 60
  ): Promise<RateLimitResult> {
    const supabase = await createClient()
    const now = new Date()
    const windowStart = new Date(now.getTime() - window * 1000)

    try {
      const { data: requests, error } = await supabase
        .from('rate_limits')
        .select('id')
        .eq('identifier', identifier)
        .gte('created_at', windowStart.toISOString())

      if (error) {
        console.error('Failed to get rate limit status:', error)
        return {
          success: true,
          limit,
          remaining: limit,
          reset: new Date(now.getTime() + window * 1000),
          error: 'Failed to get status'
        }
      }

      const requestCount = requests?.length || 0
      const remaining = Math.max(0, limit - requestCount)
      const reset = new Date(now.getTime() + window * 1000)

      return {
        success: requestCount < limit,
        limit,
        remaining,
        reset,
      }

    } catch (error) {
      console.error('Rate limit status error:', error)
      return {
        success: true,
        limit,
        remaining: limit,
        reset: new Date(now.getTime() + window * 1000),
        error: 'Status check failed'
      }
    }
  }

  /**
   * Reset rate limits for a specific identifier
   * @param identifier - Unique identifier to reset
   */
  async reset(identifier: string): Promise<void> {
    const supabase = await createClient()

    try {
      await supabase
        .from('rate_limits')
        .delete()
        .eq('identifier', identifier)
    } catch (error) {
      console.error('Failed to reset rate limit:', error)
      throw error
    }
  }
}

/**
 * Create a rate limit service instance
 */
export function createRateLimitService(): RateLimitService {
  return new RateLimitService()
}

/**
 * Helper function to extract client IP from request
 * Works with Next.js Request object and headers
 */
export function getClientIp(request?: Request): string {
  if (!request) {
    return 'unknown'
  }

  // Try to get real IP from headers (behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  const xClientIp = request.headers.get('x-client-ip')
  if (xClientIp) {
    return xClientIp
  }

  // Fallback to a default value (not ideal but prevents errors)
  return 'unknown'
}

/**
 * Rate limiting configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - stricter limits
  LOGIN: { limit: 5, window: 300 }, // 5 attempts per 5 minutes
  SIGNUP: { limit: 3, window: 900 }, // 3 attempts per 15 minutes
  PASSWORD_RESET: { limit: 3, window: 3600 }, // 3 attempts per hour

  // API endpoints - more lenient
  API_DEFAULT: { limit: 100, window: 60 }, // 100 requests per minute
  API_HEAVY: { limit: 10, window: 60 }, // 10 heavy requests per minute
} as const

/**
 * Check rate limits for authentication endpoints
 * @param type - Type of authentication action
 * @param identifier - IP address or email identifier
 * @returns Rate limit result
 */
export async function checkAuthRateLimit(
  type: keyof typeof RATE_LIMIT_CONFIGS,
  identifier: string
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[type]
  const rateLimitService = new RateLimitService()

  return rateLimitService.checkLimit(identifier, config.limit, config.window)
}
