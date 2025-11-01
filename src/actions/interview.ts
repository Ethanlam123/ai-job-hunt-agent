'use server'

import { createClient } from '@/lib/supabase/server'
import { InterviewAgent } from '@/lib/agents/interview-agent'
import { InterviewService } from '@/lib/services/interview-service'
import { revalidatePath } from 'next/cache'

/**
 * Generate interview questions from CV and JD
 */
export async function generateInterviewQuestions(input: {
  cvDocumentId: string
  jdDocumentId: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  questionCount?: number
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const {
      cvDocumentId,
      jdDocumentId,
      difficulty = 'intermediate',
      questionCount = 10,
    } = input

    // Validate that both documents exist and belong to the user
    const { data: cvDoc, error: cvError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', cvDocumentId)
      .eq('user_id', user.id)
      .single()

    if (cvError || !cvDoc) {
      return { success: false, error: 'CV document not found' }
    }

    const { data: jdDoc, error: jdError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', jdDocumentId)
      .eq('user_id', user.id)
      .single()

    if (jdError || !jdDoc) {
      return { success: false, error: 'Job description not found' }
    }

    // Create session for this interview preparation
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        current_stage: 'interview_preparation',
        state: {
          cvDocumentId,
          jdDocumentId,
          difficulty,
          questionCount,
        },
      })
      .select()
      .single()

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    // Initialize Interview Agent
    const interviewAgent = new InterviewAgent(supabase)

    // Generate questions
    const result = await interviewAgent.generateInterviewQuestions(
      cvDocumentId,
      jdDocumentId,
      session.id,
      user.id,
      difficulty,
      questionCount
    )

    if (result.error) {
      return {
        success: false,
        error: result.error,
        sessionId: session.id,
      }
    }

    // Revalidate paths
    revalidatePath('/interview')
    revalidatePath(`/workflow/${session.id}`)

    return {
      success: true,
      sessionId: session.id,
      questionCount: result.questions.length,
      difficulty: result.difficulty,
    }
  } catch (error: unknown) {
    console.error('Generate interview questions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate interview questions',
    }
  }
}

/**
 * Get interview questions for a session
 */
export async function getInterviewQuestions(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const interviewService = new InterviewService(supabase)
    const questions = await interviewService.getInterviewQuestions(sessionId, user.id)

    return {
      success: true,
      questions,
    }
  } catch (error: unknown) {
    console.error('Get interview questions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch interview questions',
    }
  }
}

/**
 * Get a specific question by ID
 */
export async function getQuestion(questionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const interviewService = new InterviewService(supabase)
    const question = await interviewService.getQuestion(questionId, user.id)

    if (!question) {
      return { success: false, error: 'Question not found' }
    }

    return {
      success: true,
      question,
    }
  } catch (error: unknown) {
    console.error('Get question error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch question',
    }
  }
}

/**
 * Submit an answer to an interview question and get evaluation
 */
export async function submitAnswer(input: {
  questionId: string
  answer: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const { questionId, answer } = input

    // Validate answer
    if (!answer || answer.trim().length === 0) {
      return { success: false, error: 'Answer cannot be empty' }
    }

    // Initialize Interview Agent for evaluation
    const interviewAgent = new InterviewAgent(supabase)

    // Evaluate the answer
    const evaluation = await interviewAgent.evaluateAnswer(
      questionId,
      answer.trim(),
      user.id
    )

    // Revalidate interview page
    revalidatePath('/interview')

    return {
      success: true,
      evaluation,
    }
  } catch (error: unknown) {
    console.error('Submit answer error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit answer',
    }
  }
}

/**
 * Get session progress and statistics
 */
export async function getSessionProgress(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const interviewService = new InterviewService(supabase)
    const progress = await interviewService.getSessionProgress(sessionId, user.id)

    return {
      success: true,
      progress,
    }
  } catch (error: unknown) {
    console.error('Get session progress error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch session progress',
    }
  }
}

/**
 * Analyze overall interview performance for a session
 */
export async function analyzeInterviewPerformance(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Initialize Interview Agent
    const interviewAgent = new InterviewAgent(supabase)

    // Analyze performance
    const performanceAnalysis = await interviewAgent.analyzePerformance(
      sessionId,
      user.id
    )

    return {
      success: true,
      performanceAnalysis,
    }
  } catch (error: unknown) {
    console.error('Analyze performance error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze interview performance',
    }
  }
}

/**
 * Get user's interview history
 */
export async function getInterviewHistory() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const interviewService = new InterviewService(supabase)
    const history = await interviewService.getInterviewHistory(user.id)

    return {
      success: true,
      history,
    }
  } catch (error: unknown) {
    console.error('Get interview history error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch interview history',
    }
  }
}

/**
 * Get overall interview statistics for the user
 */
export async function getInterviewStatistics() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const interviewService = new InterviewService(supabase)
    const statistics = await interviewService.getInterviewStatistics(user.id)

    return {
      success: true,
      statistics,
    }
  } catch (error: unknown) {
    console.error('Get interview statistics error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch interview statistics',
    }
  }
}

/**
 * Delete an interview session and all its questions
 */
export async function deleteInterviewSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const interviewService = new InterviewService(supabase)
    await interviewService.deleteInterviewSession(sessionId, user.id)

    // Revalidate paths
    revalidatePath('/interview')
    revalidatePath('/history')

    return {
      success: true,
    }
  } catch (error: unknown) {
    console.error('Delete interview session error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete interview session',
    }
  }
}

/**
 * Get unanswered questions for a session
 */
export async function getUnansweredQuestions(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const interviewService = new InterviewService(supabase)
    const questions = await interviewService.getUnansweredQuestions(sessionId, user.id)

    return {
      success: true,
      questions,
    }
  } catch (error: unknown) {
    console.error('Get unanswered questions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch unanswered questions',
    }
  }
}
