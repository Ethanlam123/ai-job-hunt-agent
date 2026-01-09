/**
 * Cache Service
 *
 * PostgreSQL-based caching with RLS support.
 * Cache keys are scoped as: user:{userId}:{key} or public:{key}
 * RLS policies enforce access control at the database level.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { cache } from '@/lib/db/schema'
import { eq, lt, like } from 'drizzle-orm'
import { db } from '@/lib/db'

export interface CacheOptions {
  ttl?: number // Time to live in seconds (default: 3600 = 1 hour)
}

export class CacheService {
  constructor(_supabase: SupabaseClient) {}

  /**
   * Generate RLS-aware cache key
   * User-specific keys: user:{userId}:{key}
   * Public keys: public:{key}
   */
  private generateKey(key: string, userId?: string): string {
    return userId ? `user:${userId}:${key}` : `public:${key}`
  }

  /**
   * Set a cache value with optional TTL
   */
  async set<T = any>(
    key: string,
    value: T,
    userId: string | undefined,
    ttl: number = 3600
  ): Promise<void> {
    const scopedKey = this.generateKey(key, userId)
    const expiresAt = new Date(Date.now() + ttl * 1000)

    await db
      .insert(cache)
      .values({
        key: scopedKey,
        value: value as any,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: cache.key,
        set: {
          value: value as any,
          expiresAt,
        },
      })
  }

  /**
   * Get a cache value if not expired
   */
  async get<T = any>(key: string, userId?: string): Promise<T | null> {
    const scopedKey = this.generateKey(key, userId)

    const result = await db
      .select()
      .from(cache)
      .where(eq(cache.key, scopedKey))
      .limit(1)

    if (!result || result.length === 0) {
      return null
    }

    const entry = result[0]

    // Check if expired
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      await this.delete(key, userId)
      return null
    }

    return entry.value as T
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string, userId?: string): Promise<void> {
    const scopedKey = this.generateKey(key, userId)
    await db.delete(cache).where(eq(cache.key, scopedKey))
  }

  /**
   * Check if a cache key exists and is not expired
   */
  async has(key: string, userId?: string): Promise<boolean> {
    const value = await this.get(key, userId)
    return value !== null
  }

  /**
   * Clear all expired cache entries
   * Should be run periodically (e.g., via cron job)
   */
  async clearExpired(): Promise<void> {
    const now = new Date()
    await db.delete(cache).where(lt(cache.expiresAt, now))
  }

  /**
   * Clear all cache entries for a specific user
   * Matches all keys starting with user:{userId}:
   */
  async clearUserCache(userId: string): Promise<void> {
    const userKeyPattern = `user:${userId}:%`
    await db.delete(cache).where(like(cache.key, userKeyPattern))
  }
}

/**
 * Create a cache service instance
 */
export function createCacheService(supabase: SupabaseClient): CacheService {
  return new CacheService(supabase)
}
