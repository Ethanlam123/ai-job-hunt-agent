import { ChatOpenAI } from '@langchain/openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { SkillGapPrompts } from '@/lib/prompts/skill-gap-prompts'
import { DocumentService } from '@/lib/services/document-service'
import { SkillGapService, SkillGapAnalysis } from '@/lib/services/skill-gap-service'
import { APP_CONSTANTS } from '@/lib/config/app-config'

interface SkillGapState {
  userId: string
  sessionId: string
  documentId: string
  jobDescriptionText: string
  cvContent: any
  jobRequirements: any
  gapAnalysis: SkillGapAnalysis | null
  error?: string
}

export class SkillGapAgent {
  private supabase: SupabaseClient
  private llm: ChatOpenAI
  private documentService: DocumentService
  private skillGapService: SkillGapService

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase

    // Initialize OpenRouter LLM
    this.llm = new ChatOpenAI({
      model: APP_CONSTANTS.LLM_MODELS.DEFAULT,
      temperature: 0.7,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      },
    })

    this.documentService = new DocumentService(supabase)
    this.skillGapService = new SkillGapService(supabase)
  }

  /**
   * Main skill gap analysis workflow - sequential execution
   */
  async analyzeSkillGaps(
    documentId: string,
    jobDescriptionText: string,
    sessionId: string,
    userId: string
  ): Promise<SkillGapState> {
    const state: SkillGapState = {
      userId,
      sessionId,
      documentId,
      jobDescriptionText,
      cvContent: null,
      jobRequirements: null,
      gapAnalysis: null,
    }

    try {
      // Step 1: Parse CV content
      console.log('Step 1: Parsing CV content...')
      const parsedState = await this.parseCVNode(state)
      Object.assign(state, parsedState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 2: Analyze job description
      console.log('Step 2: Analyzing job description...')
      const analyzedState = await this.analyzeJobDescriptionNode(state)
      Object.assign(state, analyzedState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 3: Identify skill gaps
      console.log('Step 3: Identifying skill gaps...')
      const gapsState = await this.identifySkillGapsNode(state)
      Object.assign(state, gapsState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 4: Save results
      console.log('Step 4: Saving results...')
      const finalState = await this.saveResultsNode(state)
      Object.assign(state, finalState)

      console.log('Skill Gap Analysis completed successfully')
      return state
    } catch (error) {
      console.error('Skill Gap Analysis workflow error:', error)
      state.error = error instanceof Error ? error.message : 'Unknown error'
      await this.saveResultsNode(state)
      return state
    }
  }

  /**
   * Node 1: Parse CV content from database
   */
  private async parseCVNode(state: SkillGapState): Promise<Partial<SkillGapState>> {
    try {
      const document = await this.documentService.getDocument(
        state.documentId,
        state.userId
      )

      if (!document) {
        return { error: 'CV document not found' }
      }

      // Use parsed_content from database (already parsed during upload)
      const cvContent = document.parsed_content || {
        fullText: 'No parsed content available',
        pageCount: 0,
      }

      return {
        cvContent,
      }
    } catch (error: any) {
      console.error('Parse CV node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 2: Analyze job description using LLM
   */
  private async analyzeJobDescriptionNode(state: SkillGapState): Promise<Partial<SkillGapState>> {
    try {
      if (state.error) {
        return {} // Skip if there's an error
      }

      // Validate job description quality first
      const validation = this.skillGapService.validateJobDescriptionQuality(state.jobDescriptionText)

      if (!validation.isSufficient) {
        console.log('Job description quality is low, will provide fallback analysis')
        // Still proceed but note the quality issues
      }

      const prompt = SkillGapPrompts.extractRequirementsFromJD(state.jobDescriptionText)
      console.log('Analyze Job Description - Sending prompt to LLM...')
      const response = await this.llm.invoke(prompt)
      console.log('Analyze Job Description - LLM response received')

      // Parse LLM response
      let jobRequirements
      try {
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

        console.log('Analyze Job Description - Response content length:', content.length)

        // Remove markdown code blocks if present
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        console.log('Analyze Job Description - Cleaned content for parsing')

        jobRequirements = JSON.parse(cleanContent)
        console.log('Analyze Job Description - Parsed successfully')
      } catch (parseError) {
        console.error('Failed to parse job requirements:', parseError)
        console.error('Raw content that failed to parse:', typeof response.content === 'string' ? response.content.substring(0, 500) + '...' : 'Non-string content')

        // Fallback job requirements
        jobRequirements = {
          requiredSkills: [
            {
              name: 'Communication skills',
              category: 'soft',
              importance: 'important',
              description: 'Professional communication',
              experienceLevel: 'Not specified'
            },
            {
              name: 'Team collaboration',
              category: 'soft',
              importance: 'important',
              description: 'Working effectively in teams',
              experienceLevel: 'Not specified'
            }
          ],
          responsibilities: [
            {
              title: 'Professional responsibilities',
              skillsUsed: ['Communication', 'Teamwork'],
              importance: 'important'
            }
          ],
          qualificationSummary: {
            minExperience: 'Not specified',
            educationLevel: 'Not specified',
            mustHaveSkills: [],
            preferredSkills: []
          }
        }
        console.log('Using fallback job requirements')
      }

      // Add validation info to the response
      if (validation && !validation.isSufficient) {
        jobRequirements._validation = {
          isSufficient: false,
          qualityScore: validation.qualityScore,
          issues: validation.issues,
          suggestions: validation.suggestions
        }
      }

      return {
        jobRequirements,
      }
    } catch (error: any) {
      console.error('Analyze job description node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 3: Identify skill gaps using LLM
   */
  private async identifySkillGapsNode(state: SkillGapState): Promise<Partial<SkillGapState>> {
    try {
      if (state.error) {
        return {} // Skip if there's an error
      }

      // Check if job description was sufficient
      const hasInsufficientJD = state.jobRequirements?._validation?.isSufficient === false

      let prompt: string
      if (hasInsufficientJD) {
        // Use fallback analysis for insufficient job description
        prompt = SkillGapPrompts.generateFallbackAnalysis(state.cvContent, state.jobDescriptionText)
        console.log('Using fallback analysis due to insufficient job description')
      } else {
        // Use standard skill gap analysis
        prompt = SkillGapPrompts.analyzeSkillGaps(state.cvContent, state.jobRequirements)
        console.log('Using standard skill gap analysis')
      }

      console.log('Identify Skill Gaps - Sending prompt to LLM...')
      const response = await this.llm.invoke(prompt)
      console.log('Identify Skill Gaps - LLM response received')

      // Parse LLM response
      let gapAnalysis
      try {
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

        console.log('Identify Skill Gaps - Response content length:', content.length)

        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        console.log('Identify Skill Gaps - Cleaned content for parsing')

        gapAnalysis = JSON.parse(cleanContent)
        console.log('Identify Skill Gaps - Parsed successfully')
      } catch (parseError) {
        console.error('Failed to parse skill gaps analysis:', parseError)
        console.error('Raw content that failed to parse:', typeof response.content === 'string' ? response.content.substring(0, 500) + '...' : 'Non-string content')

        // Fallback gap analysis
        gapAnalysis = {
          overallMatch: {
            score: 50,
            summary: 'Unable to complete detailed analysis due to limited information',
            strengths: ['CV uploaded successfully'],
            criticalGaps: ['Insufficient job description details']
          },
          skillGaps: [
            {
              skillName: 'Better job description',
              category: 'domain',
              importance: 'critical',
              currentLevel: 'advanced',
              requiredLevel: 'beginner',
              gapDescription: 'Need more detailed job requirements',
              timeline: 'short',
              learningAdvice: 'Provide specific skills, experience levels, and responsibilities required',
              reasoning: 'Quality job descriptions enable better skill gap analysis'
            }
          ],
          strengthsToHighlight: [],
          generalAdvice: {
            overallStrategy: 'Gather more specific job requirements',
            quickWins: ['Ask for detailed job description', 'Research similar roles'],
            longTermGoals: ['Build relationship with recruiters', 'Understand industry standards'],
            nextSteps: ['Request detailed job description', 'Research company requirements']
          }
        }
        console.log('Using fallback gap analysis')
      }

      // Add job description quality info if available
      if (state.jobRequirements?._validation) {
        gapAnalysis.jobDescriptionQuality = state.jobRequirements._validation
        delete state.jobRequirements._validation // Remove temporary field
      }

      // Transform skill gaps to match our interface (without client-side IDs)
      if (gapAnalysis.skillGaps) {
        gapAnalysis.skillGaps = gapAnalysis.skillGaps.map((gap: any, index: number) => ({
          sessionId: state.sessionId,
          userId: state.userId,
          skillName: gap.skillName,
          category: gap.category,
          importance: gap.importance,
          currentLevel: gap.currentLevel || 'none',
          requiredLevel: gap.requiredLevel || 'beginner',
          timeline: gap.timeline || 'medium',
          learningAdvice: gap.learningAdvice || '',
          gapDescription: gap.gapDescription || '',
          reasoning: gap.reasoning || '',
          status: 'pending',
          learningResources: gap.learningResources || [],
          createdAt: new Date().toISOString(),
          order: index // Add order for reference
        }))
      }

      return {
        gapAnalysis,
      }
    } catch (error: any) {
      console.error('Identify skill gaps node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 4: Save analysis results to database
   */
  private async saveResultsNode(state: SkillGapState): Promise<Partial<SkillGapState>> {
    try {
      if (state.error) {
        // Save error state to tasks table
        await this.supabase.from('tasks').insert({
          session_id: state.sessionId,
          user_id: state.userId,
          task_type: 'skill_gap_analysis',
          status: 'failed',
          error_message: state.error,
          metadata: {
            documentId: state.documentId,
            jobDescriptionLength: state.jobDescriptionText?.length || 0,
          },
        })
        return {}
      }

      // Save successful analysis using SkillGapService
      if (!state.gapAnalysis) {
        throw new Error('Gap analysis is null, cannot save results')
      }
      const saveResult = await this.skillGapService.saveSkillGapAnalysis(
        state.sessionId,
        state.userId,
        state.gapAnalysis
      )

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save analysis results')
      }

      console.log('Skill gap analysis saved successfully')
      return {}
    } catch (error: any) {
      console.error('Save results node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Get skill gap analysis results for a session
   */
  async getAnalysisResults(sessionId: string, userId: string): Promise<{ success: boolean; data?: SkillGapAnalysis; error?: string }> {
    try {
      return await this.skillGapService.getSkillGapAnalysis(sessionId, userId)
    } catch (error: any) {
      console.error('Get analysis results error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch analysis results'
      }
    }
  }

  /**
   * Update skill gap status
   */
  async updateSkillGapStatus(
    skillGapId: string,
    userId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'not_interested',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.skillGapService.updateSkillGapStatus(skillGapId, userId, status, notes)
    } catch (error: any) {
      console.error('Update skill gap status error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update skill gap status'
      }
    }
  }

  /**
   * Get skill gaps organized by timeline
   */
  async getSkillGapsByTimeline(sessionId: string, userId: string) {
    try {
      return await this.skillGapService.getSkillGapsByTimeline(sessionId, userId)
    } catch (error: any) {
      console.error('Get skill gaps by timeline error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch skill gaps by timeline'
      }
    }
  }

  /**
   * Get skill gap statistics
   */
  async getSkillGapStats(userId: string) {
    try {
      return await this.skillGapService.getSkillGapStats(userId)
    } catch (error: any) {
      console.error('Get skill gap stats error:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch skill gap statistics'
      }
    }
  }
}