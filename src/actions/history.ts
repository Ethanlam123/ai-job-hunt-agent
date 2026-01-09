'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const GetSessionDetailsSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
})

const GetUserSessionsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
})

type SessionWithDetails = {
  id: string
  userId: string
  currentStage: string | null
  state: Record<string, any> | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  jobDescriptionId: string | null
  analysisType: string
  documents: Array<{
    id: string
    documentType: string
    originalFilename: string
    fileFormat: string
  }>
  resultCounts: {
    skillGaps: number
    interviewQuestions: number
    coverLetters: number
    messages: number
  }
}

export async function getUserSessions(input?: z.infer<typeof GetUserSessionsSchema>) {
  try {
    const { limit, offset } = GetUserSessionsSchema.parse(input || {})
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized: User not authenticated')
    }

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        current_stage,
        state,
        created_at,
        updated_at,
        completed_at,
        job_description_id,
        analysis_type
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      throw new Error('Failed to fetch session history')
    }

    // Get result counts and documents for each session
    const sessionsWithCounts = await Promise.all(
      (sessions || []).map(async (session: any) => {
        const [skillGapsCount, interviewQuestionsCount, coverLettersCount, messagesCount, documentsData] = await Promise.all([
          supabase
            .from('skill_gaps')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('user_id', user.id),
          supabase
            .from('interview_questions')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('user_id', user.id),
          supabase
            .from('cover_letters')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('user_id', user.id),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id),
          supabase
            .from('documents')
            .select(`
              id,
              document_type,
              original_filename,
              file_format,
              file_path
            `)
            .eq('session_id', session.id)
            .eq('user_id', user.id),
        ])

        return {
          id: session.id,
          userId: user.id,
          currentStage: session.current_stage,
          state: session.state,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          completedAt: session.completed_at,
          jobDescriptionId: session.job_description_id,
          analysisType: session.analysis_type || 'general',
          documents: documentsData.data?.map((doc: any) => ({
            id: doc.id,
            documentType: doc.document_type,
            originalFilename: doc.original_filename,
            fileFormat: doc.file_format || 'unknown',
            filePath: doc.file_path,
          })) || [],
          resultCounts: {
            skillGaps: skillGapsCount.count || 0,
            interviewQuestions: interviewQuestionsCount.count || 0,
            coverLetters: coverLettersCount.count || 0,
            messages: messagesCount.count || 0,
          },
        }
      }),
    )

    return {
      success: true,
      data: sessionsWithCounts,
      hasMore: sessionsWithCounts.length === limit,
    }
  } catch (error) {
    console.error('Error in getUserSessions:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input parameters',
        details: error.issues,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch session history',
    }
  }
}

export async function getSessionDetails(input: z.infer<typeof GetSessionDetailsSchema>) {
  try {
    const { sessionId } = GetSessionDetailsSchema.parse(input)
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized: User not authenticated')
    }

    // Fetch session first
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        current_stage,
        state,
        created_at,
        updated_at,
        completed_at,
        job_description_id,
        analysis_type
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or access denied')
    }

    // Fetch documents separately
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        document_type,
        original_filename,
        file_format,
        file_path,
        parsed_content
      `)
      .eq('session_id', sessionId)
      .eq('user_id', user.id)

    // Fetch detailed results based on session type
    const [skillGaps, interviewQuestions, coverLetters, messages] = await Promise.all([
      supabase
        .from('skill_gaps')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('interview_questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('cover_letters')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
    ])

    return {
      success: true,
      data: {
        id: session.id,
        currentStage: session.current_stage,
        state: session.state,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        completedAt: session.completed_at,
        jobDescriptionId: session.job_description_id,
        analysisType: session.analysis_type,
        documents: documents?.map((doc: any) => ({
          id: doc.id,
          documentType: doc.document_type,
          originalFilename: doc.original_filename,
          fileFormat: doc.file_format,
          filePath: doc.file_path,
          parsedContent: doc.parsed_content,
        })) || [],
        results: {
          skillGaps: skillGaps.data || [],
          interviewQuestions: interviewQuestions.data || [],
          coverLetter: coverLetters.data,
          messages: messages.data || [],
        },
      },
    }
  } catch (error) {
    console.error('Error in getSessionDetails:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid session ID format',
        details: error.issues,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch session details',
    }
  }
}
