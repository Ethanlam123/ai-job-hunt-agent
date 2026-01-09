/**
 * Hash Function Unit Tests
 *
 * Tests for the SHA-256 based hash function used for cache keys.
 * Verifies collision resistance, consistency, and performance.
 */

import { describe, it, expect } from '@jest/globals'
import { VectorSearchService } from '@/lib/services/vector-search-service'

describe('Hash Function (SHA-256)', () => {
  let vectorService: VectorSearchService

  beforeAll(() => {
    vectorService = new VectorSearchService()
  })

  describe('Collision Resistance', () => {
    it('should generate different hashes for different inputs', () => {
      const inputs = [
        'user1_cv_content',
        'user1_jd_content',
        'user2_cv_content',
        'similar_but_different_content',
        'similar_but_different_content!',
        'similar_but_different_content ',
      ]

      const hashes = inputs.map(input => (vectorService as any).hashText(input))

      // All hashes should be unique
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(inputs.length)

      // Verify no two hashes are the same
      for (let i = 0; i < hashes.length; i++) {
        for (let j = i + 1; j < hashes.length; j++) {
          expect(hashes[i]).not.toBe(hashes[j])
        }
      }
    })

    it('should handle large inputs without collisions', () => {
      const inputs: string[] = []

      // Generate 1000 different inputs
      for (let i = 0; i < 1000; i++) {
        inputs.push(`input_${i}_${Math.random()}`)
      }

      const hashes = inputs.map(input => (vectorService as any).hashText(input))
      const uniqueHashes = new Set(hashes)

      // All 1000 hashes should be unique
      expect(uniqueHashes.size).toBe(1000)
    })

    it('should resist collisions for similar inputs', () => {
      const similarInputs = [
        'test',
        'Test',
        'TEST',
        'test ',
        ' test',
        'test\n',
        'test\t',
        'tést',
        't3st',
        'te$t',
      ]

      const hashes = similarInputs.map(input => (vectorService as any).hashText(input))
      const uniqueHashes = new Set(hashes)

      // All should produce different hashes
      expect(uniqueHashes.size).toBe(similarInputs.length)
    })
  })

  describe('Consistency', () => {
    it('should generate the same hash for the same input', () => {
      const input = 'consistent_test_input'

      const hash1 = (vectorService as any).hashText(input)
      const hash2 = (vectorService as any).hashText(input)
      const hash3 = (vectorService as any).hashText(input)

      expect(hash1).toBe(hash2)
      expect(hash2).toBe(hash3)
    })

    it('should maintain consistency across multiple calls', () => {
      const input = 'multi_call_test'
      const iterations = 100

      const firstHash = (vectorService as any).hashText(input)

      for (let i = 0; i < iterations; i++) {
        const hash = (vectorService as any).hashText(input)
        expect(hash).toBe(firstHash)
      }
    })

    it('should be deterministic for empty string', () => {
      const emptyHash1 = (vectorService as any).hashText('')
      const emptyHash2 = (vectorService as any).hashText('')

      expect(emptyHash1).toBe(emptyHash2)
      expect(emptyHash1).toBeTruthy()
    })
  })

  describe('Output Format', () => {
    it('should produce fixed-length output', () => {
      const inputs = ['a', 'ab', 'abc', 'abcdefghijklmnopqrstuvwxyz']

      const hashes = inputs.map(input => (vectorService as any).hashText(input))

      // All hashes should have the same length (16 chars as per implementation)
      const lengths = hashes.map(h => h.length)
      const uniqueLengths = new Set(lengths)

      expect(uniqueLengths.size).toBe(1)
      expect(hashes[0].length).toBe(16)
    })

    it('should produce hexadecimal output', () => {
      const hash = (vectorService as any).hashText('test_input')

      // Should only contain hexadecimal characters
      expect(hash).toMatch(/^[a-f0-9]+$/i)
    })

    it('should handle special characters in input', () => {
      const specialInputs = [
        '!@#$%^&*()_+-=[]{}|;:,.<>?',
        '\n\r\t',
        '中文日本語한국어',
        '🚀🎉⭐',
        'a\u0000b', // null byte
        'multi\nline\nstring',
      ]

      specialInputs.forEach(input => {
        const hash = (vectorService as any).hashText(input)
        expect(hash).toMatch(/^[a-f0-9]{16}$/i)
      })
    })
  })

  describe('Performance', () => {
    it('should hash short strings quickly', () => {
      const start = Date.now()
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        (vectorService as any).hashText('short')
      }

      const duration = Date.now() - start

      // Should complete 1000 hashes in less than 100ms
      expect(duration).toBeLessThan(100)
    })

    it('should hash long strings efficiently', () => {
      const longInput = 'a'.repeat(10000)
      const start = Date.now()
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        (vectorService as any).hashText(longInput)
      }

      const duration = Date.now() - start

      // Should complete 100 hashes of 10k strings in less than 500ms
      expect(duration).toBeLessThan(500)
    })

    it('should handle very large inputs without significant degradation', () => {
      const sizes = [100, 1000, 10000, 100000]
      const times: number[] = []

      sizes.forEach(size => {
        const input = 'x'.repeat(size)
        const start = Date.now()
        const iterations = 100

        for (let i = 0; i < iterations; i++) {
          (vectorService as any).hashText(input)
        }

        times.push(Date.now() - start)
      })

      // Time should not grow exponentially
      // Each 10x increase in size should not increase time by more than 10x
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[i - 1]
        expect(ratio).toBeLessThan(15) // Allow some overhead
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle unicode correctly', () => {
      const unicodeInputs = [
        'hello世界', // Chinese
        'こんにちは', // Japanese
        '안녕하세요', // Korean
        'مرحبا', // Arabic
        'Привет', // Russian
        'Γειά', // Greek
        '🚀🎉🔥', // Emojis
      ]

      const hashes = unicodeInputs.map(input => (vectorService as any).hashText(input))

      // All should produce valid hashes
      hashes.forEach(hash => {
        expect(hash).toMatch(/^[a-f0-9]{16}$/i)
      })

      // All should be unique
      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(unicodeInputs.length)
    })

    it('should handle very long strings', () => {
      const veryLongString = 'a'.repeat(1000000) // 1MB string

      const hash = (vectorService as any).hashText(veryLongString)

      expect(hash).toMatch(/^[a-f0-9]{16}$/i)
    })

    it('should handle empty string', () => {
      const hash = (vectorService as any).hashText('')

      expect(hash).toMatch(/^[a-f0-9]{16}$/i)
      expect(hash.length).toBe(16)
    })
  })

  describe('Distribution', () => {
    it('should produce well-distributed hashes', () => {
      const inputs: string[] = []
      const numInputs = 1000

      // Generate sequential inputs
      for (let i = 0; i < numInputs; i++) {
        inputs.push(`input_${i}`)
      }

      const hashes = inputs.map(input => (vectorService as any).hashText(input))

      // Check first character distribution (hex: 0-f = 16 possibilities)
      const firstChars = hashes.map(h => h[0])
      const uniqueFirstChars = new Set(firstChars)

      // Should use most of the 16 possible first characters
      // (allowing for some variance with 1000 samples)
      expect(uniqueFirstChars.size).toBeGreaterThan(10)

      // Check character distribution across all positions
      const charCounts: Record<string, number> = {}
      hashes.forEach(hash => {
        for (const char of hash) {
          charCounts[char] = (charCounts[char] || 0) + 1
        }
      })

      // Each hex character should appear reasonably often
      // (16000 total characters / 16 hex chars = 1000 expected each)
      const counts = Object.values(charCounts)
      const minCount = Math.min(...counts)
      const maxCount = Math.max(...counts)

      // Distribution should be relatively even (within factor of 3)
      expect(maxCount / minCount).toBeLessThan(3)
    })
  })
})
