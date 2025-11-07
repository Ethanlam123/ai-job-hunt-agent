/**
 * StatsService
 *
 * Provides user statistics and metrics for dashboard display
 */

import { createClient } from '@/lib/supabase/server'

export interface UserStats {
  totalSessions: number
  cvsAnalyzed: number
  coverLetters: number
  mockInterviews: number
  completedSessions: number
}

export class StatsService {
  /**
   * Get comprehensive user statistics
   * @param userId - User ID
   * @returns User statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const supabase = await createClient()

    try {
      // Get total sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
        throw sessionsError
      }

      const totalSessions = sessionsData?.length || 0

      // Get completed sessions
      const { data: completedSessionsData, error: completedSessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)

      if (completedSessionsError) {
        console.error('Error fetching completed sessions:', completedSessionsError)
        throw completedSessionsError
      }

      const completedSessions = completedSessionsData?.length || 0

      // Get CVs analyzed (documents with type 'cv')
      const { data: cvsData, error: cvsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', userId)
        .eq('document_type', 'cv')

      if (cvsError) {
        console.error('Error fetching CVs:', cvsError)
        throw cvsError
      }

      const cvsAnalyzed = cvsData?.length || 0

      // Get cover letters generated
      const { data: coverLettersData, error: coverLettersError } = await supabase
        .from('cover_letters')
        .select('id')
        .eq('user_id', userId)

      if (coverLettersError) {
        console.error('Error fetching cover letters:', coverLettersError)
        throw coverLettersError
      }

      const coverLettersCount = coverLettersData?.length || 0

      // Get mock interviews (count distinct sessions with interview questions)
      const { data: interviewData, error: interviewError } = await supabase
        .from('interview_questions')
        .select('session_id')
        .eq('user_id', userId)

      if (interviewError) {
        console.error('Error fetching interviews:', interviewError)
        throw interviewError
      }

      // Count unique sessions
      const uniqueSessions = new Set(interviewData?.map(q => q.session_id) || [])
      const mockInterviews = uniqueSessions.size

      return {
        totalSessions,
        cvsAnalyzed,
        coverLetters: coverLettersCount,
        mockInterviews,
        completedSessions,
      }

    } catch (error) {
      console.error('StatsService.getUserStats error:', error)
      // Return default stats on error
      return {
        totalSessions: 0,
        cvsAnalyzed: 0,
        coverLetters: 0,
        mockInterviews: 0,
        completedSessions: 0,
      }
    }
  }

  /**
   * Get recent activity for a user
   * @param userId - User ID
   * @param limit - Number of recent items to fetch
   */
  async getRecentActivity(userId: string, limit: number = 5) {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent activity:', error)
        throw error
      }

      return data || []

    } catch (error) {
      console.error('StatsService.getRecentActivity error:', error)
      return []
    }
  }

  /**
   * Get user's document count by type
   * @param userId - User ID
   */
  async getDocumentStats(userId: string) {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('document_type')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching document stats:', error)
        throw error
      }

      return (data || []).reduce(
        (acc, doc) => {
          if (doc.document_type) {
            acc[doc.document_type] = (acc[doc.document_type] || 0) + 1
          }
          return acc
        },
        {} as Record<string, number>
      )

    } catch (error) {
      console.error('StatsService.getDocumentStats error:', error)
      return {}
    }
  }

  /**
   * Get interview performance stats
   * @param userId - User ID
   */
  async getInterviewStats(userId: string) {
    const supabase = await createClient()

    try {
      // Total questions
      const { data: totalQuestionsData, error: totalError } = await supabase
        .from('interview_questions')
        .select('id')
        .eq('user_id', userId)

      if (totalError) {
        console.error('Error fetching total questions:', totalError)
        throw totalError
      }

      const totalQuestions = totalQuestionsData?.length || 0

      // Answered questions
      const { data: answeredQuestionsData, error: answeredError } = await supabase
        .from('interview_questions')
        .select('id')
        .eq('user_id', userId)
        .not('user_answer', 'is', null)

      if (answeredError) {
        console.error('Error fetching answered questions:', answeredError)
        throw answeredError
      }

      const answeredQuestions = answeredQuestionsData?.length || 0

      return {
        totalQuestions,
        answeredQuestions,
        completionRate: totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0,
      }

    } catch (error) {
      console.error('StatsService.getInterviewStats error:', error)
      return {
        totalQuestions: 0,
        answeredQuestions: 0,
        completionRate: 0,
      }
    }
  }
}

/**
 * Create a stats service instance
 */
export function createStatsService(): StatsService {
  return new StatsService()
}
