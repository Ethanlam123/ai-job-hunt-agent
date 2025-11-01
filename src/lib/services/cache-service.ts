/**
 * CacheService
 *
 * PostgreSQL-based caching with RLS support
 * Cache keys must be scoped: user:{userId}:{key} or public:{key}
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { cache } from '@/lib/db/schema'
import { eq, lt } from 'drizzle-orm'
import { db } from '@/lib/db'

export interface CacheOptions {
  ttl?: number // Time to live in seconds (default: 3600 = 1 hour)
}

export class CacheService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Generate RLS-aware cache key
   * @param key - The base cache key
   * @param userId - Optional user ID for user-scoped cache
   * @returns Properly scoped cache key
   */
  private generateKey(key: string, userId?: string): string {
    if (userId) {
      return `user:${userId}:${key}`
    }
    return `public:${key}`
  }

  /**
   * Set a cache value
   * @param key - Cache key (will be scoped automatically)
   * @param value - Value to cache (must be JSON-serializable)
   * @param userId - Optional user ID for user-scoped cache
   * @param ttl - Time to live in seconds (default: 3600)
   */
  async set<T = any>(
    key: string,
    value: T,
    userId?: string,
    ttl: number = 3600
  ): Promise<void> {
    const scopedKey = this.generateKey(key, userId)
    const expiresAt = new Date(Date.now() + ttl * 1000)

    // Upsert: insert or update if key exists
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
   * Get a cache value
   * @param key - Cache key (will be scoped automatically)
   * @param userId - Optional user ID for user-scoped cache
   * @returns Cached value or null if not found/expired
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
      // Delete expired entry
      await this.delete(key, userId)
      return null
    }

    return entry.value as T
  }

  /**
   * Delete a cache entry
   * @param key - Cache key (will be scoped automatically)
   * @param userId - Optional user ID for user-scoped cache
   */
  async delete(key: string, userId?: string): Promise<void> {
    const scopedKey = this.generateKey(key, userId)

    await db.delete(cache).where(eq(cache.key, scopedKey))
  }

  /**
   * Check if a cache key exists and is not expired
   * @param key - Cache key (will be scoped automatically)
   * @param userId - Optional user ID for user-scoped cache
   */
  async has(key: string, userId?: string): Promise<boolean> {
    const value = await this.get(key, userId)
    return value !== null
  }

  /**
   * Clear all expired cache entries (cleanup task)
   * Should be run periodically (e.g., via cron job)
   */
  async clearExpired(): Promise<void> {
    const now = new Date()
    await db.delete(cache).where(lt(cache.expiresAt, now))
  }

  /**
   * Clear all cache entries for a specific user
   * @param userId - User ID
   */
  async clearUserCache(userId: string): Promise<void> {

    // Delete all entries matching user:{userId}:*
    await db.delete(cache).where(eq(cache.key, `user:${userId}:%`))
  }
}

/**
 * Create a cache service instance with the provided Supabase client
 */
export function createCacheService(supabase: SupabaseClient): CacheService {
  return new CacheService(supabase)
}
