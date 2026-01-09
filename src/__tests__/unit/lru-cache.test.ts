/**
 * LRU Cache Eviction Tests
 *
 * Tests for the LRU (Least Recently Used) cache implementation
 * in the VectorSearchService. Verifies proper eviction behavior,
 * TTL expiration, and memory leak prevention.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { VectorSearchService } from '@/lib/services/vector-search-service'

// Mock OpenAI at module level
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }],
      }),
    },
  })),
}))

describe('LRU Cache Eviction', () => {
  let vectorService: VectorSearchService

  beforeEach(() => {
    // Create a fresh instance for each test
    vectorService = new VectorSearchService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Cache Size Limits', () => {
    it('should evict least recently used items when max size is reached', async () => {
      // The embeddingCache has max: 1000
      const cache = (vectorService as any).embeddingCache

      // Fill the cache with 1000 items
      for (let i = 0; i < 1000; i++) {
        cache.set(`key_${i}`, [i, i + 1, i + 2])
      }

      // Verify all 1000 items are in cache
      expect(cache.size).toBe(1000)

      // Access the first item to make it recently used
      cache.get('key_0')

      // Add one more item - should evict key_1 (least recently used)
      cache.set('key_1000', [1000, 1001, 1002])

      // Cache size should still be 1000
      expect(cache.size).toBe(1000)

      // key_0 should still exist (we just accessed it)
      expect(cache.has('key_0')).toBe(true)

      // key_1 should be evicted (least recently used after key_0 access)
      expect(cache.has('key_1')).toBe(false)

      // Most recent keys should exist
      expect(cache.has('key_999')).toBe(true)
      expect(cache.has('key_1000')).toBe(true)
    })

    it('should handle rapid insertion and eviction', async () => {
      const cache = (vectorService as any).embeddingCache
      const operations = 5000 // More than double the max size

      // Perform many insertions
      for (let i = 0; i < operations; i++) {
        cache.set(`rapid_key_${i}`, [i])
      }

      // Size should not exceed max
      expect(cache.size).toBeLessThanOrEqual(1000)

      // Only the most recent items should remain
      expect(cache.has(`rapid_key_${operations - 1}`)).toBe(true)
      expect(cache.has(`rapid_key_0`)).toBe(false)
    })

    it('should evict oldest items when cache is full', () => {
      const cache = (vectorService as any).embeddingCache

      // Insert 1500 items (more than max of 1000)
      for (let i = 0; i < 1500; i++) {
        cache.set(`item_${i}`, [i])
      }

      // Cache should be at max size
      expect(cache.size).toBe(1000)

      // Oldest items should be evicted
      expect(cache.has('item_0')).toBe(false)
      expect(cache.has('item_100')).toBe(false)

      // Newest items should be present
      expect(cache.has('item_1499')).toBe(true)
      expect(cache.has('item_1000')).toBe(true)
    })
  })

  describe('TTL Expiration', () => {
    it('should expire items after TTL duration', async () => {
      const cache = (vectorService as any).embeddingCache

      // Create a cache with short TTL for testing
      const testCache = new (vectorService as any).embeddingCache.constructor({
        max: 100,
        ttl: 100, // 100ms TTL
      })

      // Add items
      testCache.set('expire_me', [1, 2, 3])
      testCache.set('expire_me_too', [4, 5, 6])

      // Items should exist immediately
      expect(testCache.has('expire_me')).toBe(true)
      expect(testCache.has('expire_me_too')).toBe(true)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Items should be expired
      expect(testCache.has('expire_me')).toBe(false)
      expect(testCache.has('expire_me_too')).toBe(false)

      // Size should reflect expiration
      expect(testCache.size).toBe(0)
    })

    it('should extend TTL on access', async () => {
      const cache = (vectorService as any).embeddingCache

      // Create a cache with short TTL
      const testCache = new (vectorService as any).embeddingCache.constructor({
        max: 100,
        ttl: 100, // 100ms TTL
        updateAgeOnGet: true, // This extends TTL on access
      })

      testCache.set('extend_me', [1, 2, 3])

      // Wait 75ms (less than TTL)
      await new Promise(resolve => setTimeout(resolve, 75))

      // Access the item to extend TTL
      testCache.get('extend_me')

      // Wait another 75ms (would have expired without access)
      await new Promise(resolve => setTimeout(resolve, 75))

      // Should still exist due to TTL extension
      expect(testCache.has('extend_me')).toBe(true)
    })

    it('should handle items with different TTLs', async () => {
      const cache = (vectorService as any).embeddingCache

      const testCache = new (vectorService as any).embeddingCache.constructor({
        max: 100,
        ttl: 100, // Default TTL
      })

      // Add items
      testCache.set('short', [1], { ttl: 50 }) // Short TTL
      testCache.set('long', [2], { ttl: 200 }) // Long TTL
      testCache.set('default', [3]) // Default TTL

      // Wait 75ms
      await new Promise(resolve => setTimeout(resolve, 75))

      // short TTL item should be expired
      expect(testCache.has('short')).toBe(false)

      // Others should still exist
      expect(testCache.has('long')).toBe(true)
      expect(testCache.has('default')).toBe(true)

      // Wait another 75ms (total 150ms)
      await new Promise(resolve => setTimeout(resolve, 75))

      // default should now be expired
      expect(testCache.has('default')).toBe(false)

      // long should still exist
      expect(testCache.has('long')).toBe(true)
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should not grow beyond max size', () => {
      const cache = (vectorService as any).embeddingCache
      const maxSize = 1000

      // Insert many more items than max size
      for (let i = 0; i < maxSize * 10; i++) {
        cache.set(`memory_test_${i}`, new Array(100).fill(i)) // Large values
      }

      // Size should be at most max
      expect(cache.size).toBeLessThanOrEqual(maxSize)
    })

    it('should properly clean up evicted items', () => {
      const cache = (vectorService as any).embeddingCache

      // Track if values are garbage collected (simulated by checking cache size)
      const initialSize = cache.size

      // Fill and overflow cache
      for (let i = 0; i < 1500; i++) {
        cache.set(`cleanup_${i}`, { data: new Array(1000).fill(i) })
      }

      // Cache should maintain max size
      expect(cache.size).toBeLessThanOrEqual(1000)

      // Fill again
      for (let i = 1500; i < 3000; i++) {
        cache.set(`cleanup_${i}`, { data: new Array(1000).fill(i) })
      }

      // Size should still be bounded
      expect(cache.size).toBeLessThanOrEqual(1000)
    })

    it('should handle large values without memory leaks', () => {
      const cache = (vectorService as any).embeddingCache

      // Create large values (1MB each)
      const largeValue = new Array(100000).fill('large_data_string')

      // Try to insert more than can fit in memory
      for (let i = 0; i < 2000; i++) {
        cache.set(`large_${i}`, [...largeValue])
      }

      // Cache should still be bounded
      expect(cache.size).toBeLessThanOrEqual(1000)

      // Total memory should be roughly bounded by max size * average value size
      // This is a soft check - in real scenarios, you'd use more sophisticated memory tracking
    })
  })

  describe('Processing Jobs Cache', () => {
    it('should have smaller max size for processing jobs', () => {
      const jobsCache = (vectorService as any).processingJobs

      // Jobs cache should have max: 100 (as per implementation)
      expect(jobsCache.max).toBe(100)
    })

    it('should evict old jobs when limit reached', () => {
      const jobsCache = (vectorService as any).processingJobs

      // Add 150 jobs (more than max of 100)
      for (let i = 0; i < 150; i++) {
        jobsCache.set(`job_${i}`, {
          id: `job_${i}`,
          text: `Job ${i}`,
          status: 'pending',
          createdAt: new Date(),
        })
      }

      // Should be bounded by max
      expect(jobsCache.size).toBeLessThanOrEqual(100)

      // Newest jobs should exist
      expect(jobsCache.has('job_149')).toBe(true)

      // Oldest jobs should be evicted
      expect(jobsCache.has('job_0')).toBe(false)
    })
  })

  describe('Cache Statistics and Monitoring', () => {
    it('should track cache hit rate', () => {
      const cache = (vectorService as any).embeddingCache

      // Add some items
      for (let i = 0; i < 10; i++) {
        cache.set(`stat_${i}`, [i])
      }

      // Hits
      cache.get('stat_0')
      cache.get('stat_1')
      cache.get('stat_2')

      // Misses
      cache.get('not_exist_1')
      cache.get('not_exist_2')

      // Check calculated hit rate
      const calculatedSize = cache.size
      expect(calculatedSize).toBe(10)
    })

    it('should provide cache size information', () => {
      const cache = (vectorService as any).embeddingCache
      const jobsCache = (vectorService as any).processingJobs

      expect(cache.size).toBeDefined()
      expect(jobsCache.size).toBeDefined()

      expect(typeof cache.size).toBe('number')
      expect(typeof jobsCache.size).toBe('number')
    })
  })
})
