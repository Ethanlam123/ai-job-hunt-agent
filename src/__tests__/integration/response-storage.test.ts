/**
 * Integration tests for response storage functionality
 */

import { CVAgent } from '@/lib/agents/cv-agent'
import { createClient } from '@supabase/supabase-js'

describe('Response Storage Integration', () => {
  let supabase: any
  let cvAgent: CVAgent
  let testUserId: string
  let testSessionId: string

  beforeAll(async () => {
    // Initialize Supabase client for testing
    if (process.env.DATABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey
      )
      cvAgent = new CVAgent(supabase)

      // Create test data
      testUserId = 'test-user-' + Date.now()
      testSessionId = 'test-session-' + Date.now()
    }
  })

  describe('saveResponses', () => {
    it('should save responses to user_responses table', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      const responses = [
        {
          questionId: 'q1',
          questionCategory: 'personal',
          questionText: 'What is your full name?',
          answer: 'John Doe',
          isSkipped: false
        },
        {
          questionId: 'q2',
          questionCategory: 'experience',
          questionText: 'Describe your key achievements',
          answer: {
            achievements: [
              'Led team of 5 developers',
              'Increased revenue by 30%',
              'Reduced costs by $100K'
            ]
          },
          isSkipped: false
        },
        {
          questionId: 'q3',
          questionCategory: 'formatting',
          questionText: 'Preferred CV length?',
          answer: '2 pages',
          isSkipped: false
        }
      ]

      const result = await cvAgent.saveResponses(
        testSessionId,
        testUserId,
        responses
      )

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('savedCount')
      expect(result.savedCount).toBe(3)
    })

    it('should handle skipped responses', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      const responses = [
        {
          questionId: 'q4',
          questionCategory: 'career',
          questionText: 'What is your target role?',
          answer: null,
          isSkipped: true,
          skipReason: 'Not applicable to my situation'
        },
        {
          questionId: 'q5',
          questionCategory: 'experience',
          questionText: 'Describe your leadership experience',
          answer: 'I have led teams of various sizes',
          isSkipped: false
        }
      ]

      const result = await cvAgent.saveResponses(
        testSessionId,
        testUserId,
        responses
      )

      expect(result).toHaveProperty('success')
      expect(result.savedCount).toBeGreaterThanOrEqual(0)
    })

    it('should update session stage to summary after saving', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      const responses = [
        {
          questionId: 'q6',
          questionCategory: 'personal',
          questionText: 'Contact email?',
          answer: 'john@example.com',
          isSkipped: false
        }
      ]

      await cvAgent.saveResponses(
        testSessionId,
        testUserId,
        responses
      )

      // Verify session stage was updated
      const { data: session } = await supabase
        .from('sessions')
        .select('current_stage')
        .eq('id', testSessionId)
        .single()

      expect(session?.current_stage).toBe('summary')
    })

    it('should handle database errors gracefully', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      // Test with invalid data that should cause database error
      const responses = [
        {
          questionId: '', // Invalid empty ID
          questionCategory: 'personal',
          questionText: 'Test question',
          answer: 'Test answer',
          isSkipped: false
        }
      ]

      const result = await cvAgent.saveResponses(
        testSessionId,
        testUserId,
        responses
      )

      // Should handle error without throwing
      expect(result).toHaveProperty('success')
      if (!result.success) {
        expect(result).toHaveProperty('error')
      }
    })
  })

  describe('getResponses', () => {
    beforeEach(async () => {
      // Clean up any existing test data
      if (supabase) {
        await supabase
          .from('user_responses')
          .delete()
          .eq('session_id', testSessionId)
          .eq('user_id', testUserId)
      }
    })

    it('should retrieve non-skipped responses', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      // First save some test responses
      const testResponses = [
        {
          questionId: 'get-test-1',
          questionCategory: 'personal',
          questionText: 'Full name?',
          answer: 'Jane Smith',
          isSkipped: false
        },
        {
          questionId: 'get-test-2',
          questionCategory: 'experience',
          questionText: 'Years of experience?',
          answer: 5,
          isSkipped: false
        },
        {
          questionId: 'get-test-3',
          questionCategory: 'career',
          questionText: 'Target industry?',
          answer: null,
          isSkipped: true
        }
      ]

      await cvAgent.saveResponses(testSessionId, testUserId, testResponses)

      // Retrieve responses
      const responses = await cvAgent.getResponses(testSessionId, testUserId)

      expect(responses).toHaveLength(2) // Only non-skipped responses
      expect(responses[0].answer).toBe('Jane Smith')
      expect(responses[1].answer).toBe(5)
    })

    it('should return empty array when no responses exist', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      const responses = await cvAgent.getResponses('non-existent-session', 'non-existent-user')

      expect(responses).toEqual([])
    })

    it('should handle missing table gracefully', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      // Mock table not found error
      const originalFrom = supabase.from
      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                order: jest.fn().mockRejectedValue({
                  code: 'PGRST205'
                })
              })
            })
          })
        })
      })

      const responses = await cvAgent.getResponses(testSessionId, testUserId)

      expect(responses).toEqual([])

      // Restore original function
      supabase.from = originalFrom
    })
  })

  describe('Response Validation', () => {
    it('should validate response structure', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      const validResponses = [
        {
          questionId: 'validation-test-1',
          questionCategory: 'personal',
          questionText: 'Email address?',
          answer: 'test@example.com',
          isSkipped: false
        }
      ]

      const result = await cvAgent.saveResponses(
        testSessionId,
        testUserId,
        validResponses
      )

      expect(result.success).toBe(true)

      // Verify the saved data structure
      const { data: savedResponses } = await supabase
        .from('user_responses')
        .select('*')
        .eq('session_id', testSessionId)
        .eq('user_id', testUserId)

      expect(savedResponses).toHaveLength(1)
      expect(savedResponses[0]).toMatchObject({
        question_id: 'validation-test-1',
        question_category: 'personal',
        question_text: 'Email address?',
        answer: 'test@example.com',
        is_required: 'true',
        is_skipped: 'false'
      })
    })

    it('should handle different answer types', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      const responses = [
        {
          questionId: 'type-test-string',
          questionCategory: 'personal',
          questionText: 'Name?',
          answer: 'John Doe',
          isSkipped: false
        },
        {
          questionId: 'type-test-number',
          questionCategory: 'experience',
          questionText: 'Years of experience?',
          answer: 5,
          isSkipped: false
        },
        {
          questionId: 'type-test-object',
          questionCategory: 'achievements',
          questionText: 'Key achievements?',
          answer: {
            metric: '30% increase',
            scope: 'team of 5',
            impact: 'revenue growth'
          },
          isSkipped: false
        },
        {
          questionId: 'type-test-array',
          questionCategory: 'skills',
          questionText: 'Technical skills?',
          answer: ['JavaScript', 'React', 'Node.js'],
          isSkipped: false
        }
      ]

      const result = await cvAgent.saveResponses(
        testSessionId,
        testUserId,
        responses
      )

      expect(result.success).toBe(true)
      expect(result.savedCount).toBe(4)

      // Verify different types were stored correctly
      const { data: savedResponses } = await supabase
        .from('user_responses')
        .select('question_id, answer')
        .eq('session_id', testSessionId)
        .eq('user_id', testUserId)

      expect(savedResponses).toHaveLength(4)

      const stringResponse = savedResponses.find((r: any) => r.question_id === 'type-test-string')
      const numberResponse = savedResponses.find((r: any) => r.question_id === 'type-test-number')
      const objectResponse = savedResponses.find((r: any) => r.question_id === 'type-test-object')
      const arrayResponse = savedResponses.find((r: any) => r.question_id === 'type-test-array')

      expect(stringResponse?.answer).toBe('John Doe')
      expect(numberResponse?.answer).toBe(5)
      expect(objectResponse?.answer).toEqual({
        metric: '30% increase',
        scope: 'team of 5',
        impact: 'revenue growth'
      })
      expect(arrayResponse?.answer).toEqual(['JavaScript', 'React', 'Node.js'])
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle batch response saving efficiently', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      // Create a large number of responses
      const batchSize = 50
      const responses = Array.from({ length: batchSize }, (_, i) => ({
        questionId: `perf-test-${i}`,
        questionCategory: i % 2 === 0 ? 'personal' : 'experience',
        questionText: `Test question ${i}`,
        answer: `Test answer ${i}`,
        isSkipped: false
      }))

      const startTime = Date.now()
      const result = await cvAgent.saveResponses(
        testSessionId,
        testUserId,
        responses
      )
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.savedCount).toBe(batchSize)

      // Should complete within reasonable time (adjust threshold as needed)
      const duration = endTime - startTime
      expect(duration).toBeLessThan(5000) // 5 seconds max
    })

    it('should handle concurrent response operations', async () => {
      if (!supabase) {
        console.warn('Skipping integration test - no database connection')
        return
      }

      const concurrentOperations = 5
      const promises = Array.from({ length: concurrentOperations }, (_, i) =>
        cvAgent.saveResponses(
          `${testSessionId}-concurrent-${i}`,
          `${testUserId}-concurrent-${i}`,
          [{
            questionId: `concurrent-${i}`,
            questionCategory: 'personal',
            questionText: 'Concurrent test question',
            answer: `Concurrent answer ${i}`,
            isSkipped: false
          }]
        )
      )

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.savedCount).toBe(1)
      })
    })
  })

  afterAll(async () => {
    // Clean up test data
    if (supabase) {
      try {
        await supabase
          .from('user_responses')
          .delete()
          .eq('user_id', testUserId)

        await supabase
          .from('sessions')
          .delete()
          .eq('id', testSessionId)
      } catch (error) {
        console.warn('Error cleaning up test data:', error)
      }
    }
  })
})