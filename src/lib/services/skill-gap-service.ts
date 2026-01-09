import { SupabaseClient } from '@supabase/supabase-js'

export interface SkillGap {
  id: string
  sessionId?: string
  userId?: string
  skillName: string
  category: 'technical' | 'soft' | 'domain'
  importance: 'critical' | 'important' | 'nice-to-have'
  currentLevel: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'expert'
  requiredLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  timeline: 'short' | 'medium' | 'long'
  learningAdvice: string
  gapDescription: string
  reasoning: string
  status: 'pending' | 'in_progress' | 'completed' | 'not_interested'
  learningResources: Array<{ type?: string; status?: string; updatedAt?: string; notes?: string | null; description?: string }>
  createdAt: string
  updatedAt?: string
  order?: number
}

export interface SkillGapAnalysis {
  overallMatch: {
    score: number
    summary: string
    strengths: string[]
    criticalGaps: string[]
  }
  skillGaps: SkillGap[]
  strengthsToHighlight: any[]
  generalAdvice: {
    overallStrategy: string
    quickWins: string[]
    longTermGoals: string[]
    nextSteps: string[]
  }
  jobDescriptionQuality?: {
    isSufficient: boolean
    qualityScore: number
    missingElements: string[]
    usableElements: string[]
    recommendation: string
  }
}

export class SkillGapService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Save skill gap analysis results to database
   */
  async saveSkillGapAnalysis(
    sessionId: string,
    userId: string,
    analysis: SkillGapAnalysis,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete existing skill gaps for this session
      await this.supabase
        .from('skill_gaps')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      // Insert new skill gaps
      if (analysis.skillGaps && analysis.skillGaps.length > 0) {
        const skillGapRecords = analysis.skillGaps.map((gap, index) => ({
          session_id: sessionId,
          user_id: userId,
          skill_name: gap.skillName,
          category: gap.category,
          importance: gap.importance,
          learning_resources: gap.learningResources || [],
        }))

        const { data: insertedData, error: insertError } = await this.supabase
          .from('skill_gaps')
          .insert(skillGapRecords)
          .select('id, skill_name, category, importance')

        if (insertError) {
          throw new Error(`Failed to save skill gaps: ${insertError.message}`)
        }

        // Update analysis with real database IDs
        if (insertedData && insertedData.length > 0) {
          analysis.skillGaps = analysis.skillGaps.map((gap, index) => {
            const insertedRecord = insertedData.find(record => record.skill_name === gap.skillName)
            return {
              ...gap,
              id: insertedRecord?.id || `temp-${index}`,
            }
          })
        }
      }

      // Save overall analysis to tasks table
      const { error: taskError } = await this.supabase
        .from('tasks')
        .insert({
          session_id: sessionId,
          user_id: userId,
          task_type: 'skill_gap_analysis',
          status: 'completed',
          result: analysis,
          metadata: {
            analyzedAt: new Date().toISOString(),
            skillGapCount: analysis.skillGaps?.length || 0,
            overallScore: analysis.overallMatch?.score || 0,
          },
        })

      if (taskError) {
        throw new Error(`Failed to save task: ${taskError.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Save skill gap analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get skill gap analysis results for a session
   */
  async getSkillGapAnalysis(
    sessionId: string,
    userId: string,
  ): Promise<{ success: boolean; data?: SkillGapAnalysis; error?: string }> {
    try {
      // Get task results
      const { data: taskData, error: taskError } = await this.supabase
        .from('tasks')
        .select('result, metadata')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .eq('task_type', 'skill_gap_analysis')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (taskError && taskError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch task: ${taskError.message}`)
      }

      if (taskData?.result) {
        return { success: true, data: taskData.result as SkillGapAnalysis }
      }

      // Fallback: reconstruct from skill_gaps table
      const { data: skillGaps, error: gapsError } = await this.supabase
        .from('skill_gaps')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (gapsError) {
        throw new Error(`Failed to fetch skill gaps: ${gapsError.message}`)
      }

      const reconstructedAnalysis: SkillGapAnalysis = {
        overallMatch: {
          score: 0,
          summary: 'Analysis available',
          strengths: [],
          criticalGaps: [],
        },
        skillGaps: skillGaps.map(gap => {
          // Extract status from learning_resources
          const resources = (gap.learning_resources || []) as Array<{ type?: string; status?: string; description?: string }>
          const statusInfo = resources.find(r => r.type === 'status')

          return {
            id: gap.id,
            sessionId: gap.session_id,
            userId: gap.user_id,
            skillName: gap.skill_name,
            category: gap.category as 'technical' | 'soft' | 'domain',
            importance: gap.importance as 'critical' | 'important' | 'nice-to-have',
            currentLevel: 'none',
            requiredLevel: 'beginner',
            timeline: 'medium',
            learningAdvice: resources[0]?.description || 'Learning resources available',
            gapDescription: `Skill gap identified for ${gap.skill_name}`,
            reasoning: 'Analysis completed based on CV and job requirements',
            status: (statusInfo?.status as 'pending' | 'in_progress' | 'completed' | 'not_interested') || 'pending',
            learningResources: gap.learning_resources || [],
            createdAt: gap.created_at,
            updatedAt: gap.updated_at,
          }
        }),
        strengthsToHighlight: [],
        generalAdvice: {
          overallStrategy: 'Review skill gaps and create learning plan',
          quickWins: [],
          longTermGoals: [],
          nextSteps: [],
        },
      }

      return { success: true, data: reconstructedAnalysis }
    } catch (error) {
      console.error('Get skill gap analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update skill gap status (mark as in_progress, completed, etc.)
   */
  async updateSkillGapStatus(
    skillGapId: string,
    userId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'not_interested',
    notes?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Since the schema doesn't have status field, we'll store status in learning_resources
      const currentData = await this.supabase
        .from('skill_gaps')
        .select('learning_resources')
        .eq('id', skillGapId)
        .eq('user_id', userId)
        .single()

      if (currentData.error) {
        // Check if this is a temporary ID (from old analyses before the fix)
        if (skillGapId.startsWith('gap-') || skillGapId.startsWith('temp-')) {
          throw new Error('Cannot update status for skill gap with temporary ID. Please run a new analysis to get proper database IDs.')
        }
        throw new Error(`Failed to fetch skill gap: ${currentData.error.message}`)
      }

      const updatedResources = (currentData.data.learning_resources || []) as any[]
      const statusInfo = {
        status,
        updatedAt: new Date().toISOString(),
        notes: notes || null,
      }

      // Update or add status info
      const existingStatusIndex = updatedResources.findIndex(r => r.type === 'status')
      if (existingStatusIndex >= 0) {
        updatedResources[existingStatusIndex] = { ...statusInfo, type: 'status' }
      } else {
        updatedResources.push({ ...statusInfo, type: 'status' })
      }

      const { error } = await this.supabase
        .from('skill_gaps')
        .update({ learning_resources: updatedResources })
        .eq('id', skillGapId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to update skill gap: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Update skill gap status error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get skill gaps organized by timeline for user display
   */
  async getSkillGapsByTimeline(
    sessionId: string,
    userId: string,
  ): Promise<{
    success: boolean
    data?: {
      short: SkillGap[]
      medium: SkillGap[]
      long: SkillGap[]
    }
    error?: string
  }> {
    try {
      const { success, data: analysis, error } = await this.getSkillGapAnalysis(
        sessionId,
        userId,
      )

      if (!success || !analysis) {
        return { success: false, error }
      }

      const organizedGaps = {
        short: analysis.skillGaps.filter(gap => gap.timeline === 'short'),
        medium: analysis.skillGaps.filter(gap => gap.timeline === 'medium'),
        long: analysis.skillGaps.filter(gap => gap.timeline === 'long'),
      }

      return { success: true, data: organizedGaps }
    } catch (error) {
      console.error('Get skill gaps by timeline error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get skill gap statistics for a user
   */
  async getSkillGapStats(
    userId: string,
  ): Promise<{
    success: boolean
    data?: {
      totalAnalyses: number
      totalSkillGaps: number
      completedGaps: number
      inProgressGaps: number
      pendingGaps: number
      averageScore: number
      recentAnalysis?: any
    }
    error?: string
  }> {
    try {
      // Get all skill gap analyses for user
      const { data: tasks, error: taskError } = await this.supabase
        .from('tasks')
        .select('result, metadata, created_at')
        .eq('user_id', userId)
        .eq('task_type', 'skill_gap_analysis')
        .order('created_at', { ascending: false })

      if (taskError) {
        throw new Error(`Failed to fetch tasks: ${taskError.message}`)
      }

      // Get skill gap counts by status (from learning_resources)
      const { data: skillGaps, error: gapsError } = await this.supabase
        .from('skill_gaps')
        .select('learning_resources')
        .eq('user_id', userId)

      if (gapsError) {
        throw new Error(`Failed to fetch skill gaps: ${gapsError}`)
      }

      const totalAnalyses = tasks.length
      const totalSkillGaps = skillGaps.length

      // Extract status from learning_resources
      let completedGaps = 0, inProgressGaps = 0, pendingGaps = 0
      skillGaps.forEach(gap => {
        const resources = gap.learning_resources as any[] || []
        const statusInfo = resources.find(r => r.type === 'status')
        if (statusInfo) {
          switch (statusInfo.status) {
            case 'completed': completedGaps++; break
            case 'in_progress': inProgressGaps++; break
            default: pendingGaps++
          }
        } else {
          pendingGaps++ // Default to pending
        }
      })

      // Calculate average score
      const scores = tasks
        .map(task => task.metadata?.overallScore)
        .filter(score => typeof score === 'number')
      const averageScore = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0

      return {
        success: true,
        data: {
          totalAnalyses,
          totalSkillGaps,
          completedGaps,
          inProgressGaps,
          pendingGaps,
          averageScore: Math.round(averageScore),
          recentAnalysis: tasks[0] || null,
        },
      }
    } catch (error) {
      console.error('Get skill gap stats error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Validate job description quality
   */
  validateJobDescriptionQuality(jobDescription: string): {
    isSufficient: boolean
    qualityScore: number
    issues: string[]
    suggestions: string[]
  } {
    const issues: string[] = []
    const suggestions: string[] = []

    if (!jobDescription || jobDescription.trim().length < 50) {
      issues.push('Job description is too short')
      suggestions.push('Provide a more detailed job description')
      return {
        isSufficient: false,
        qualityScore: 0,
        issues,
        suggestions,
      }
    }

    // Check for specific skill mentions
    const hasSkills = /\b(skills?|requirements?|qualifications?|technologies?|tools?)\b/i.test(jobDescription)
    if (!hasSkills) {
      issues.push('No clear skill requirements mentioned')
      suggestions.push('Add specific skills and qualifications required')
    }

    // Check for experience levels
    const hasExperience = /\b(\d+\+?\s*(years?|yrs?)|experience|level)\b/i.test(jobDescription)
    if (!hasExperience) {
      issues.push('No experience requirements specified')
      suggestions.push('Include required experience levels')
    }

    // Check for responsibilities
    const hasResponsibilities = /\b(responsibilities?|duties?|role|position)\b/i.test(jobDescription)
    if (!hasResponsibilities) {
      issues.push('Job responsibilities not clearly defined')
      suggestions.push('Add specific responsibilities and daily tasks')
    }

    const qualityScore = Math.max(0, 100 - (issues.length * 25))
    const isSufficient = qualityScore >= 50 && issues.length <= 2

    return {
      isSufficient,
      qualityScore,
      issues,
      suggestions,
    }
  }
}
