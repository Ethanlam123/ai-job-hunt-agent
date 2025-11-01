/**
 * RateLimitService
 *
 * PostgreSQL-based rate limiting using sliding window algorithm
 * Tracks requests per identifier (IP address or user ID) within a time window
 */

import { rateLimits } from '@/lib/db/schema'
import { db } from '@/lib/db'
import { eq, gte, and } from 'drizzle-orm'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
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
    const now = new Date()
    const windowStart = new Date(now.getTime() - window * 1000)

    // Count requests within the window
    const requests = await db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          gte(rateLimits.createdAt, windowStart)
        )
      )

    const requestCount = requests.length
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
    await db.insert(rateLimits).values({
      identifier,
      createdAt: now,
    })

    return {
      success: true,
      limit,
      remaining,
      reset,
    }
  }

  /**
   * Clean up old rate limit records
   * Should be run periodically to prevent table bloat
   * @param olderThan - Delete records older than this many seconds (default: 3600 = 1 hour)
   */
  async cleanup(olderThan: number = 3600): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThan * 1000)
    await db.delete(rateLimits).where(eq(rateLimits.createdAt, cutoffDate))
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
    const now = new Date()
    const windowStart = new Date(now.getTime() - window * 1000)

    const requests = await db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          gte(rateLimits.createdAt, windowStart)
        )
      )

    const requestCount = requests.length
    const remaining = Math.max(0, limit - requestCount)
    const reset = new Date(now.getTime() + window * 1000)

    return {
      success: requestCount < limit,
      limit,
      remaining,
      reset,
    }
  }

  /**
   * Reset rate limits for a specific identifier
   * @param identifier - Unique identifier to reset
   */
  async reset(identifier: string): Promise<void> {
    await db.delete(rateLimits).where(eq(rateLimits.identifier, identifier))
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
 * Works with Next.js Request object
 */
export function getClientIp(request: Request): string {
  // Try to get real IP from headers (behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a default value (not ideal but prevents errors)
  return 'unknown'
}
