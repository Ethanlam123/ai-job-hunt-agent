/**
 * StatsService
 *
 * Provides user statistics and metrics for dashboard display
 * Implements dependency injection pattern for better testability
 */

import { createClient } from '@/lib/supabase/server'

export interface UserStats {
  totalSessions: number
  cvsAnalyzed: number
  coverLetters: number
  mockInterviews: number
  completedSessions: number
}

export interface DocumentStats {
  [documentType: string]: number
}

export interface InterviewStats {
  totalQuestions: number
  answeredQuestions: number
  completionRate: number
}

export interface IStatsService {
  getUserStats(userId: string): Promise<UserStats>
  getRecentActivity(userId: string, limit?: number): Promise<any[]>
  getDocumentStats(userId: string): Promise<DocumentStats>
  getInterviewStats(userId: string): Promise<InterviewStats>
}

export interface StatsServiceDependencies {
  supabaseClient?: any
}

export class StatsService implements IStatsService {
  private supabaseClient: any

  constructor(dependencies: StatsServiceDependencies = {}) {
    this.supabaseClient = dependencies.supabaseClient
  }

  private async getSupabaseClient() {
    return this.supabaseClient || await createClient()
  }

  /**
   * Get comprehensive user statistics
   * Optimized to use batch queries instead of N+1 pattern
   * @param userId - User ID
   * @returns User statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const supabase = await this.getSupabaseClient()

    try {
      // Execute multiple queries in parallel to reduce database round trips
      const [
        sessionsResult,
        completedSessionsResult,
        documentsResult,
        coverLettersResult,
        interviewQuestionsResult
      ] = await Promise.allSettled([
        // Get total sessions count
        supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),

        // Get completed sessions count
        supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('completed_at', 'is', null),

        // Get documents stats by type (including CVs)
        supabase
          .from('documents')
          .select('document_type')
          .eq('user_id', userId),

        // Get cover letters count
        supabase
          .from('cover_letters')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),

        // Get interview questions for mock interview count
        supabase
          .from('interview_questions')
          .select('session_id')
          .eq('user_id', userId)
      ])

      // Process results with proper error handling
      let totalSessions = 0
      let completedSessions = 0
      let cvsAnalyzed = 0
      let coverLettersCount = 0
      let mockInterviews = 0

      // Handle sessions count
      if (sessionsResult.status === 'fulfilled' && !sessionsResult.value.error) {
        totalSessions = sessionsResult.value.count || 0
      } else {
        console.error('Error fetching sessions count:', sessionsResult.status === 'rejected' ? sessionsResult.reason : sessionsResult.value?.error)
      }

      // Handle completed sessions count
      if (completedSessionsResult.status === 'fulfilled' && !completedSessionsResult.value.error) {
        completedSessions = completedSessionsResult.value.count || 0
      } else {
        console.error('Error fetching completed sessions count:', completedSessionsResult.status === 'rejected' ? completedSessionsResult.reason : completedSessionsResult.value?.error)
      }

      // Handle documents and extract CV count
      if (documentsResult.status === 'fulfilled' && !documentsResult.value.error) {
        const documents = documentsResult.value.data || []
        cvsAnalyzed = documents.filter((doc: any) => doc.document_type === 'cv').length
      } else {
        console.error('Error fetching documents:', documentsResult.status === 'rejected' ? documentsResult.reason : documentsResult.value?.error)
      }

      // Handle cover letters count
      if (coverLettersResult.status === 'fulfilled' && !coverLettersResult.value.error) {
        coverLettersCount = coverLettersResult.value.count || 0
      } else {
        console.error('Error fetching cover letters count:', coverLettersResult.status === 'rejected' ? coverLettersResult.reason : coverLettersResult.value?.error)
      }

      // Handle interview questions and count unique sessions
      if (interviewQuestionsResult.status === 'fulfilled' && !interviewQuestionsResult.value.error) {
        const interviewData = interviewQuestionsResult.value.data || []
        const uniqueSessions = new Set(interviewData.map((q: any) => q.session_id))
        mockInterviews = uniqueSessions.size
      } else {
        console.error('Error fetching interview questions:', interviewQuestionsResult.status === 'rejected' ? interviewQuestionsResult.reason : interviewQuestionsResult.value?.error)
      }

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
    const supabase = await this.getSupabaseClient()

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
  async getDocumentStats(userId: string): Promise<DocumentStats> {
    const supabase = await this.getSupabaseClient()

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
        (acc: any, doc: any) => {
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
   * Optimized to use batch queries instead of sequential queries
   * @param userId - User ID
   */
  async getInterviewStats(userId: string): Promise<InterviewStats> {
    const supabase = await this.getSupabaseClient()

    try {
      // Execute both queries in parallel
      const [totalQuestionsResult, answeredQuestionsResult] = await Promise.allSettled([
        // Get total questions count
        supabase
          .from('interview_questions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),

        // Get answered questions count
        supabase
          .from('interview_questions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('user_answer', 'is', null)
      ])

      let totalQuestions = 0
      let answeredQuestions = 0

      // Handle total questions
      if (totalQuestionsResult.status === 'fulfilled' && !totalQuestionsResult.value.error) {
        totalQuestions = totalQuestionsResult.value.count || 0
      } else {
        console.error('Error fetching total questions:', totalQuestionsResult.status === 'rejected' ? totalQuestionsResult.reason : totalQuestionsResult.value?.error)
      }

      // Handle answered questions
      if (answeredQuestionsResult.status === 'fulfilled' && !answeredQuestionsResult.value.error) {
        answeredQuestions = answeredQuestionsResult.value.count || 0
      } else {
        console.error('Error fetching answered questions:', answeredQuestionsResult.status === 'rejected' ? answeredQuestionsResult.reason : answeredQuestionsResult.value?.error)
      }

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
 * Create a stats service instance with optional dependency injection
 * @param dependencies - Optional dependencies for testing or custom implementations
 */
export function createStatsService(dependencies?: StatsServiceDependencies): StatsService {
  return new StatsService(dependencies)
}

/**
 * Create a mock stats service for testing
 * @param mockData - Mock data to return from methods
 */
export function createMockStatsService(mockData: {
  userStats?: UserStats
  recentActivity?: any[]
  documentStats?: DocumentStats
  interviewStats?: InterviewStats
}): IStatsService {
  return {
    getUserStats: async () => mockData.userStats || {
      totalSessions: 0,
      cvsAnalyzed: 0,
      coverLetters: 0,
      mockInterviews: 0,
      completedSessions: 0,
    },
    getRecentActivity: async () => mockData.recentActivity || [],
    getDocumentStats: async () => mockData.documentStats || {},
    getInterviewStats: async () => mockData.interviewStats || {
      totalQuestions: 0,
      answeredQuestions: 0,
      completionRate: 0,
    },
  }
}
