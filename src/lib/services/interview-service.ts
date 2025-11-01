import { SupabaseClient } from '@supabase/supabase-js'

export interface InterviewSession {
  id: string
  sessionId: string
  cvDocumentId: string
  jdDocumentId: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  questionCount: number
  createdAt: string
}

export interface InterviewQuestion {
  id: string
  sessionId: string
  questionType: string
  difficulty: string
  questionText: string
  expectedAnswer: string
  evaluationCriteria: string[]
  orderIndex: number
  userAnswer?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluationResult?: any
  answeredAt?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any
}

export interface InterviewStatistics {
  totalSessions: number
  totalQuestions: number
  answeredQuestions: number
  averageScore: number
  strongCategories: string[]
  weakCategories: string[]
}

export class InterviewService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Get interview questions for a session
   */
  async getInterviewQuestions(
    sessionId: string,
    userId: string
  ): Promise<InterviewQuestion[]> {
    const { data, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch interview questions: ${error.message}`)
    }

    return (data || []).map(this.mapDatabaseQuestion)
  }

  /**
   * Get a specific question by ID
   */
  async getQuestion(questionId: string, userId: string): Promise<InterviewQuestion | null> {
    const { data, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('id', questionId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch question: ${error.message}`)
    }

    return this.mapDatabaseQuestion(data)
  }

  /**
   * Get all unanswered questions for a session
   */
  async getUnansweredQuestions(
    sessionId: string,
    userId: string
  ): Promise<InterviewQuestion[]> {
    const { data, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .is('user_answer', null)
      .order('order_index', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch unanswered questions: ${error.message}`)
    }

    return (data || []).map(this.mapDatabaseQuestion)
  }

  /**
   * Get all answered questions for a session
   */
  async getAnsweredQuestions(
    sessionId: string,
    userId: string
  ): Promise<InterviewQuestion[]> {
    const { data, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .not('user_answer', 'is', null)
      .order('order_index', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch answered questions: ${error.message}`)
    }

    return (data || []).map(this.mapDatabaseQuestion)
  }

  /**
   * Save user's answer to a question
   */
  async saveAnswer(
    questionId: string,
    answer: string,
    userId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('interview_questions')
      .update({
        user_answer: answer,
        answered_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to save answer: ${error.message}`)
    }
  }

  /**
   * Get interview session progress
   */
  async getSessionProgress(
    sessionId: string,
    userId: string
  ): Promise<{
    totalQuestions: number
    answeredQuestions: number
    percentComplete: number
    averageScore: number | null
  }> {
    const { data, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to fetch session progress: ${error.message}`)
    }

    const questions = data || []
    const answeredQuestions = questions.filter((q) => q.user_answer)
    const questionsWithScores = answeredQuestions.filter(
      (q) => q.evaluation_result && typeof q.evaluation_result.score === 'number'
    )

    const averageScore =
      questionsWithScores.length > 0
        ? questionsWithScores.reduce(
            (sum, q) => sum + q.evaluation_result.score,
            0
          ) / questionsWithScores.length
        : null

    return {
      totalQuestions: questions.length,
      answeredQuestions: answeredQuestions.length,
      percentComplete: questions.length > 0
        ? Math.round((answeredQuestions.length / questions.length) * 100)
        : 0,
      averageScore,
    }
  }

  /**
   * Get user's interview history
   */
  async getInterviewHistory(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('task_type', 'interview_preparation')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch interview history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get interview statistics for a user
   */
  async getInterviewStatistics(userId: string): Promise<InterviewStatistics> {
    // Get all interview questions for the user
    const { data: questions, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to fetch statistics: ${error.message}`)
    }

    const allQuestions = questions || []
    const answeredQuestions = allQuestions.filter((q) => q.user_answer)
    const questionsWithScores = answeredQuestions.filter(
      (q) => q.evaluation_result && typeof q.evaluation_result.score === 'number'
    )

    // Calculate average score
    const averageScore =
      questionsWithScores.length > 0
        ? questionsWithScores.reduce(
            (sum, q) => sum + q.evaluation_result.score,
            0
          ) / questionsWithScores.length
        : 0

    // Calculate category scores
    const categoryScores: Record<string, { total: number; count: number }> = {}
    questionsWithScores.forEach((q) => {
      const category = q.question_type
      if (!categoryScores[category]) {
        categoryScores[category] = { total: 0, count: 0 }
      }
      categoryScores[category].total += q.evaluation_result.score
      categoryScores[category].count += 1
    })

    const categoryAverages = Object.entries(categoryScores).map(
      ([category, stats]) => ({
        category,
        average: stats.total / stats.count,
      })
    )

    // Sort by average score
    categoryAverages.sort((a, b) => b.average - a.average)

    const strongCategories = categoryAverages
      .filter((c) => c.average > 7)
      .map((c) => c.category)
    const weakCategories = categoryAverages
      .filter((c) => c.average < 5)
      .map((c) => c.category)

    // Get unique sessions
    const uniqueSessions = new Set(allQuestions.map((q) => q.session_id))

    return {
      totalSessions: uniqueSessions.size,
      totalQuestions: allQuestions.length,
      answeredQuestions: answeredQuestions.length,
      averageScore: Math.round(averageScore * 10) / 10,
      strongCategories,
      weakCategories,
    }
  }

  /**
   * Delete an interview session and all its questions
   */
  async deleteInterviewSession(sessionId: string, userId: string): Promise<void> {
    // Delete questions (will cascade delete via RLS)
    const { error: questionsError } = await this.supabase
      .from('interview_questions')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (questionsError) {
      throw new Error(`Failed to delete questions: ${questionsError.message}`)
    }

    // Delete task record
    const { error: taskError } = await this.supabase
      .from('tasks')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('task_type', 'interview_preparation')

    if (taskError) {
      throw new Error(`Failed to delete task: ${taskError.message}`)
    }
  }

  /**
   * Map database row to InterviewQuestion interface
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseQuestion(row: any): InterviewQuestion {
    return {
      id: row.id,
      sessionId: row.session_id,
      questionType: row.question_type,
      difficulty: row.difficulty,
      questionText: row.question_text,
      expectedAnswer: row.expected_answer,
      evaluationCriteria: row.evaluation_criteria || [],
      orderIndex: row.order_index,
      userAnswer: row.user_answer,
      evaluationResult: row.evaluation_result,
      answeredAt: row.answered_at,
      metadata: row.metadata,
    }
  }
}
