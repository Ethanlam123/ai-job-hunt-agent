/**
 * StatsService
 *
 * Provides user statistics and metrics for dashboard display
 */

import { createClient as createDbClient } from '@/lib/db'
import { sessions, documents, coverLetters, interviewQuestions } from '@/lib/db/schema'
import { eq, and, isNotNull, sql } from 'drizzle-orm'

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
    const db = await createDbClient()

    // Get total sessions
    const sessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(eq(sessions.userId, userId))

    const totalSessions = Number(sessionsResult[0]?.count || 0)

    // Get completed sessions
    const completedSessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNotNull(sessions.completedAt)))

    const completedSessions = Number(completedSessionsResult[0]?.count || 0)

    // Get CVs analyzed (documents with type 'cv')
    const cvsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.documentType, 'cv')))

    const cvsAnalyzed = Number(cvsResult[0]?.count || 0)

    // Get cover letters generated
    const coverLettersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId))

    const coverLettersCount = Number(coverLettersResult[0]?.count || 0)

    // Get mock interviews (count distinct sessions with interview questions)
    const interviewsResult = await db
      .select({ count: sql<number>`count(DISTINCT ${interviewQuestions.sessionId})` })
      .from(interviewQuestions)
      .where(eq(interviewQuestions.userId, userId))

    const mockInterviews = Number(interviewsResult[0]?.count || 0)

    return {
      totalSessions,
      cvsAnalyzed,
      coverLetters: coverLettersCount,
      mockInterviews,
      completedSessions,
    }
  }

  /**
   * Get recent activity for a user
   * @param userId - User ID
   * @param limit - Number of recent items to fetch
   */
  async getRecentActivity(userId: string, limit: number = 5) {
    const db = await createDbClient()

    const recentSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(sessions.createdAt)
      .limit(limit)

    return recentSessions
  }

  /**
   * Get user's document count by type
   * @param userId - User ID
   */
  async getDocumentStats(userId: string) {
    const db = await createDbClient()

    const stats = await db
      .select({
        documentType: documents.documentType,
        count: sql<number>`count(*)`,
      })
      .from(documents)
      .where(eq(documents.userId, userId))
      .groupBy(documents.documentType)

    return stats.reduce(
      (acc, stat) => {
        if (stat.documentType) {
          acc[stat.documentType] = Number(stat.count)
        }
        return acc
      },
      {} as Record<string, number>
    )
  }

  /**
   * Get interview performance stats
   * @param userId - User ID
   */
  async getInterviewStats(userId: string) {
    const db = await createDbClient()

    // Total questions
    const totalQuestionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(interviewQuestions)
      .where(eq(interviewQuestions.userId, userId))

    const totalQuestions = Number(totalQuestionsResult[0]?.count || 0)

    // Answered questions
    const answeredQuestionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(interviewQuestions)
      .where(and(eq(interviewQuestions.userId, userId), isNotNull(interviewQuestions.userAnswer)))

    const answeredQuestions = Number(answeredQuestionsResult[0]?.count || 0)

    return {
      totalQuestions,
      answeredQuestions,
      completionRate: totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0,
    }
  }
}

/**
 * Create a stats service instance
 */
export function createStatsService(): StatsService {
  return new StatsService()
}
