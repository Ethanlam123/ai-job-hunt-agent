/**
 * Unit tests for CV question generation logic
 */

import { CVPrompts } from '@/lib/prompts/cv-prompts'
import { CVAgent } from '@/lib/agents/cv-agent'

describe('CVPrompts', () => {
  describe('generateContextualQuestions', () => {
    it('should generate a valid prompt with all required context', () => {
      const cvContent = { fullText: 'Software Engineer with 5 years experience' }
      const cvAnalysis = { general: { weaknesses: ['Missing metrics'] } }
      const approvedImprovements = [
        { id: 'imp1', section: 'experience', type: 'edit' }
      ]
      const jobDescription = { fullText: 'Senior Software Engineer position' }
      const userProfile = {
        currentLevel: 'Mid-Level',
        targetRole: 'Senior Software Engineer',
        industry: 'Technology',
        yearsExperience: '5 years'
      }

      const prompt = CVPrompts.generateContextualQuestions(
        cvContent,
        cvAnalysis,
        approvedImprovements,
        jobDescription,
        userProfile
      )

      expect(prompt).toContain('You are an expert CV strategist')
      expect(prompt).toContain('CONTEXT ANALYSIS')
      expect(prompt).toContain('Current CV Content:')
      expect(prompt).toContain('CV Analysis Results:')
      expect(prompt).toContain('Approved Improvements:')
      expect(prompt).toContain('Job Description Context:')
      expect(prompt).toContain('User Profile:')
      expect(prompt).toContain('Current Career Level: Mid-Level')
      expect(prompt).toContain('Target Role: Senior Software Engineer')
      expect(prompt).toContain('Industry Focus: Technology')
      expect(prompt).toContain('Years of Experience: 5 years')
    })

    it('should handle missing context gracefully', () => {
      const prompt = CVPrompts.generateContextualQuestions(
        null,
        null,
        [],
        null,
        {}
      )

      expect(prompt).toContain('No CV content available')
      expect(prompt).toContain('No analysis available')
      expect(prompt).toContain('No approved improvements')
      expect(prompt).toContain('No job description provided')
      expect(prompt).toContain('Current Career Level: Not specified')
      expect(prompt).toContain('Target Role: Not specified')
    })

    it('should include question generation strategy and principles', () => {
      const prompt = CVPrompts.generateContextualQuestions(
        { fullText: 'Test content' },
        { general: { weaknesses: [] } },
        [],
        null,
        {}
      )

      expect(prompt).toContain('QUESTION GENERATION STRATEGY')
      expect(prompt).toContain('HIGH PRIORITY (Must Include)')
      expect(prompt).toContain('MEDIUM PRIORITY')
      expect(prompt).toContain('LOWER PRIORITY')
      expect(prompt).toContain('QUESTION DESIGN PRINCIPLES')
      expect(prompt).toContain('CONTEXTUAL AWARENESS')
      expect(prompt).toContain('METRIC-ORIENTED')
      expect(prompt).toContain('IMPACT-FOCUSED')
      expect(prompt).toContain('PERSONALIZATION INDICATORS')
    })

    it('should specify output format in JSON', () => {
      const prompt = CVPrompts.generateContextualQuestions(
        { fullText: 'Test content' },
        { general: { weaknesses: [] } },
        [],
        null,
        {}
      )

      expect(prompt).toContain('OUTPUT FORMAT')
      expect(prompt).toContain('"questions": [')
      expect(prompt).toContain('"questionStrategy": {')
      expect(prompt).toContain('Return ONLY valid JSON')
    })
  })

  describe('generateAchievementDetailQuestions', () => {
    it('should generate follow-up questions for achievement details', () => {
      const initialResponse = 'I led a team to improve the product'
      const questionContext = {
        category: 'achievements',
        questionText: 'Describe your leadership experience',
        cvReference: 'Experience section shows team leadership'
      }

      const prompt = CVPrompts.generateAchievementDetailQuestions(
        initialResponse,
        questionContext
      )

      expect(prompt).toContain('You are helping a user provide more detailed')
      expect(prompt).toContain('Initial Response:')
      expect(prompt).toContain('I led a team to improve the product')
      expect(prompt).toContain('Question Context:')
      expect(prompt).toContain('FOLLOW-UP QUESTION GENERATION STRATEGY')
      expect(prompt).toContain('Specific Metrics')
      expect(prompt).toContain('Business Impact')
      expect(prompt).toContain('Scale and Reach')
      expect(prompt).toContain('Innovation and Improvement')
      expect(prompt).toContain('Recognition and Awards')
      expect(prompt).toContain('OUTPUT FORMAT')
      expect(prompt).toContain('"followUpQuestions": [')
      expect(prompt).toContain('"analysis": {')
      expect(prompt).toContain('Return ONLY valid JSON')
    })

    it('should handle empty initial response', () => {
      const prompt = CVPrompts.generateAchievementDetailQuestions(
        '',
        { category: 'general', questionText: 'Test question' }
      )

      expect(prompt).toContain('Initial Response:')
      expect(prompt).toContain('Question Context:')
      expect(prompt).toContain('FOLLOW-UP QUESTION GENERATION STRATEGY')
    })
  })
})

describe('CVAgent Question Generation', () => {
  let mockSupabase: any
  let cvAgent: CVAgent

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }

    // Mock DocumentService
    const mockDocumentService = {
      getDocument: jest.fn(() => Promise.resolve({
        parsed_content: { fullText: 'Software Engineer experience' }
      }))
    }

    cvAgent = new (CVAgent as any)(mockSupabase)
    ;(cvAgent as any).documentService = mockDocumentService
    ;(cvAgent as any).llm = {
      invoke: jest.fn(() => Promise.resolve({
        content: JSON.stringify({
          questions: [
            {
              id: 'test-question-1',
              category: 'achievements',
              priority: 'high',
              type: 'textarea',
              question: 'What measurable impact did your work have?',
              context: {
                cvReference: 'Experience section',
                improvementLink: 'Add quantifiable achievements',
                whyThisMatters: 'Recruiters want to see measurable impact'
              },
              guidance: {
                whatToInclude: 'Specific metrics and percentages',
                exampleAnswer: 'Increased revenue by 30%',
                avoidThis: 'Vague statements without numbers'
              },
              required: true
            }
          ],
          questionStrategy: {
            totalQuestions: 1,
            highPriorityCount: 1,
            focusAreas: ['achievements'],
            personalizationScore: 85,
            estimatedTime: '5-10 minutes'
          }
        })
      }))
    }
  })

  describe('generateQuestions', () => {
    it('should generate dynamic questions using LLM', async () => {
      // Mock getAnalysisResults
      jest.spyOn(cvAgent as any, 'getAnalysisResults').mockResolvedValue({
        result: {
          analysis: { general: { weaknesses: ['Missing metrics'] } },
          documentId: 'doc-123',
          jobDescriptionId: 'jd-456'
        }
      })

      // Mock getApprovedImprovements
      jest.spyOn(cvAgent as any, 'getApprovedImprovements').mockResolvedValue([
        { id: 'imp1', section: 'experience', type: 'edit' }
      ])

      // Mock getSessionData
      jest.spyOn(cvAgent as any, 'getSessionData').mockResolvedValue({
        targetRole: 'Senior Software Engineer'
      })

      // Mock getDocumentContent
      jest.spyOn(cvAgent as any, 'getDocumentContent')
        .mockResolvedValueOnce({ fullText: 'Software Engineer with 5 years experience' })
        .mockResolvedValueOnce({ fullText: 'Senior Software Engineer position' })

      // Mock saveQuestions
      jest.spyOn(cvAgent as any, 'saveQuestions').mockResolvedValue()

      const questions = await cvAgent.generateQuestions('session-123', 'user-123')

      expect(questions).toHaveLength(1)
      expect(questions[0]).toMatchObject({
        id: 'test-question-1',
        category: 'achievements',
        text: 'What measurable impact did your work have?',
        type: 'textarea',
        required: true,
        placeholder: 'Specific metrics and percentages'
      })
    })

    it('should fallback to static questions if LLM fails', async () => {
      // Mock LLM to fail
      ;(cvAgent as any).llm.invoke.mockRejectedValue(new Error('LLM failed'))

      // Mock getAnalysisResults
      jest.spyOn(cvAgent as any, 'getAnalysisResults').mockResolvedValue({
        result: {
          analysis: { general: { weaknesses: [] } },
          documentId: null,
          jobDescriptionId: null
        }
      })

      // Mock other methods
      jest.spyOn(cvAgent as any, 'getApprovedImprovements').mockResolvedValue([])
      jest.spyOn(cvAgent as any, 'getSessionData').mockResolvedValue({})
      jest.spyOn(cvAgent as any, 'saveQuestions').mockResolvedValue()

      const questions = await cvAgent.generateQuestions('session-123', 'user-123')

      // Should not throw and should return questions
      expect(Array.isArray(questions)).toBe(true)
    })
  })

  describe('extractCareerLevel', () => {
    it('should extract senior level from CV content', () => {
      const cvContent = { fullText: 'Senior Software Engineer with team leadership experience' }
      const level = (cvAgent as any).extractCareerLevel(cvContent, null)
      expect(level).toBe('Senior')
    })

    it('should extract junior level from CV content', () => {
      const cvContent = { fullText: 'Junior Developer learning new technologies' }
      const level = (cvAgent as any).extractCareerLevel(cvContent, null)
      expect(level).toBe('Junior')
    })

    it('should extract manager level from CV content', () => {
      const cvContent = { fullText: 'Product Manager leading cross-functional teams' }
      const level = (cvAgent as any).extractCareerLevel(cvContent, null)
      expect(level).toBe('Manager')
    })

    it('should default to mid-level for unclear content', () => {
      const cvContent = { fullText: 'Developer working on various projects' }
      const level = (cvAgent as any).extractCareerLevel(cvContent, null)
      expect(level).toBe('Mid-Level')
    })
  })

  describe('extractYearsExperience', () => {
    it('should extract years from CV content', () => {
      const cvContent = { fullText: '5 years of experience in software development' }
      const years = (cvAgent as any).extractYearsExperience(cvContent)
      expect(years).toBe('2-5 years')
    })

    it('should handle different year formats', () => {
      const cvContent = { fullText: '10+ years of professional experience' }
      const years = (cvAgent as any).extractYearsExperience(cvContent)
      expect(years).toBe('10+ years')
    })

    it('should return not specified for no experience found', () => {
      const cvContent = { fullText: 'Software developer passionate about technology' }
      const years = (cvAgent as any).extractYearsExperience(cvContent)
      expect(years).toBe('Not specified')
    })
  })

  describe('extractIndustry', () => {
    it('should extract technology industry', () => {
      const cvContent = { fullText: 'Software engineer in technology sector' }
      const jobDescription = { fullText: 'Tech company looking for developers' }
      const industry = (cvAgent as any).extractIndustry(cvContent, jobDescription)
      expect(industry).toBe('technology')
    })

    it('should extract healthcare industry', () => {
      const cvContent = { fullText: 'Healthcare IT professional' }
      const industry = (cvAgent as any).extractIndustry(cvContent, null)
      expect(industry).toBe('healthcare')
    })

    it('should return not specified for unknown industry', () => {
      const cvContent = { fullText: 'Professional with various skills' }
      const industry = (cvAgent as any).extractIndustry(cvContent, null)
      expect(industry).toBe('Not specified')
    })
  })

  describe('generateFollowUpQuestions', () => {
    it('should generate follow-up questions for achievement details', async () => {
      // Mock question data
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: {
                    question_category: 'achievements',
                    question_text: 'Describe your key achievements'
                  }
                }))
              }))
            }))
          }))
        }))
      })

      const result = await cvAgent.generateFollowUpQuestions(
        'session-123',
        'user-123',
        'question-1',
        'I improved the product performance'
      )

      expect(result).toHaveProperty('followUpQuestions')
      expect(result).toHaveProperty('analysis')
      expect(result.followUpQuestions).toBeInstanceOf(Array)
    })

    it('should handle errors gracefully', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ error: 'Database error' }))
              }))
            }))
          }))
        }))
      })

      const result = await cvAgent.generateFollowUpQuestions(
        'session-123',
        'user-123',
        'question-1',
        'Test response'
      )

      expect(result).toEqual({
        followUpQuestions: [],
        analysis: { currentDetailLevel: 'low' }
      })
    })
  })
})