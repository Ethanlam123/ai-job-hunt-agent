import { createClient } from '@/lib/supabase/server'

export interface SessionDocument {
  id: string
  documentType: 'cv' | 'jd' | 'cover_letter'
  originalFilename: string
  fileFormat: string
  filePath?: string
}

// Raw document data from database (snake_case)
interface RawDocumentData {
  id: string
  document_type: string
  original_filename: string
  file_format?: string
  file_path?: string
  parsed_content?: any
}

export interface SessionResultCounts {
  skillGaps: number
  interviewQuestions: number
  coverLetters: number
  messages: number
}

export interface SessionWithDetails {
  id: string
  userId?: string // Make optional for now
  currentStage: string | null
  state: Record<string, any> | null
  createdAt: Date | string
  updatedAt: Date | string
  completedAt: Date | string | null
  jobDescriptionId: string | null
  analysisType: string
  documents: SessionDocument[] | any[]
  resultCounts: SessionResultCounts
}

export interface SessionDetails {
  id: string
  currentStage: string | null
  state: Record<string, any> | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  jobDescriptionId: string | null
  analysisType: string
  documents: SessionDocument[]
  results: {
    skillGaps: any[]
    interviewQuestions: any[]
    coverLetter: any
    messages: any[]
  }
}

export interface SessionSummary {
  id: string
  analysisType: string
  stageDisplay: string
  createdAt: Date | string
  status: 'completed' | 'processing' | 'failed'
  cvDocument?: SessionDocument
  jdDocument?: SessionDocument
  resultSummary: string
}

class SessionDataService {
  private supabase: Awaited<ReturnType<typeof createClient>>

  constructor() {
    this.supabase = null as any // Will be initialized in methods
  }

  private async getClient() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  async getUserSessions(userId: string, limit: number = 20, offset: number = 0): Promise<{
    sessions: SessionWithDetails[]
    hasMore: boolean
    total: number
  }> {
    try {
      const supabase = await this.getClient()

      // Fetch sessions with related documents
      const { data: sessions, error, count } = await supabase
        .from('sessions')
        .select(`
          id,
          currentStage,
          state,
          createdAt,
          updatedAt,
          completedAt,
          jobDescriptionId,
          analysisType,
          documents (
            id,
            documentType,
            originalFilename,
            fileFormat,
            filePath
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching sessions:', error)
        throw new Error('Failed to fetch session history')
      }

      // Get result counts for each session
      const sessionsWithCounts = await Promise.all(
        (sessions || []).map(async (session) => {
          const supabase = await this.getClient()

          const [skillGapsResult, interviewQuestionsResult, coverLettersResult, messagesResult] = await Promise.all([
            supabase
              .from('skill_gaps')
              .select('id', { count: 'exact', head: true })
              .eq('session_id', session.id)
              .eq('user_id', userId),
            supabase
              .from('interview_questions')
              .select('id', { count: 'exact', head: true })
              .eq('session_id', session.id)
              .eq('user_id', userId),
            supabase
              .from('cover_letters')
              .select('id', { count: 'exact', head: true })
              .eq('session_id', session.id)
              .eq('user_id', userId),
            supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('session_id', session.id)
          ])

          return {
            ...session,
            resultCounts: {
              skillGaps: skillGapsResult.count || 0,
              interviewQuestions: interviewQuestionsResult.count || 0,
              coverLetters: coverLettersResult.count || 0,
              messages: messagesResult.count || 0,
            }
          }
        })
      )

      return {
        sessions: sessionsWithCounts,
        hasMore: sessionsWithCounts.length === limit,
        total: count || 0
      }
    } catch (error) {
      console.error('Error in getUserSessions:', error)
      throw error
    }
  }

  async getSessionDetails(sessionId: string, userId: string): Promise<SessionDetails> {
    try {
      const supabase = await this.getClient()

      // Fetch session with documents
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          currentStage,
          state,
          createdAt,
          updatedAt,
          completedAt,
          jobDescriptionId,
          analysisType,
          documents (
            id,
            documentType,
            originalFilename,
            fileFormat,
            filePath,
            parsedContent
          )
        `)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (sessionError || !session) {
        throw new Error('Session not found or access denied')
      }

      // Fetch detailed results
      const [skillGapsResult, interviewQuestionsResult, coverLettersResult, messagesResult] = await Promise.all([
        supabase
          .from('skill_gaps')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('interview_questions')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .order('order_index', { ascending: true }),
        supabase
          .from('cover_letters')
          .select('*')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .single(),
        supabase
          .from('messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
      ])

      return {
        ...session,
        results: {
          skillGaps: skillGapsResult.data || [],
          interviewQuestions: interviewQuestionsResult.data || [],
          coverLetter: coverLettersResult.data,
          messages: messagesResult.data || []
        }
      }
    } catch (error) {
      console.error('Error in getSessionDetails:', error)
      throw error
    }
  }

  createSessionSummary(session: SessionWithDetails): SessionSummary {
    const cvDocument = session.documents.find(doc => doc.documentType === 'cv')
    const jdDocument = session.documents.find(doc => doc.documentType === 'jd')

    // Determine session status
    let status: 'completed' | 'processing' | 'failed' = 'processing'
    if (session.completedAt) {
      status = 'completed'
    } else if (session.state?.error) {
      status = 'failed'
    }

    // Create display name for analysis type
    const stageDisplay = this.getStageDisplayName(session.currentStage)

    // Create result summary
    const resultSummary = this.createResultSummary(session.currentStage, session.resultCounts)

    return {
      id: session.id,
      analysisType: session.analysisType,
      stageDisplay,
      createdAt: session.createdAt,
      status,
      cvDocument,
      jdDocument,
      resultSummary
    }
  }

  private getStageDisplayName(stage: string | null): string {
    if (!stage) return 'Unknown'

    const stageNames: Record<string, string> = {
      'cv_analysis': 'CV Analysis',
      'skill_gap': 'Skill Gap Analysis',
      'interview_preparation': 'Interview Preparation',
      'generating_cover_letter': 'Cover Letter Generation',
      'skill-gap': 'Skill Gap Analysis'
    }

    return stageNames[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  private createResultSummary(stage: string | null, counts: SessionResultCounts): string {
    if (!stage) return 'No results available'

    switch (stage) {
      case 'cv_analysis':
        return 'Analysis completed with improvement suggestions'
      case 'skill_gap':
      case 'skill-gap':
        return `${counts.skillGaps} skills identified for development`
      case 'interview_preparation':
        return `${counts.interviewQuestions} practice questions generated`
      case 'generating_cover_letter':
        return counts.coverLetters > 0 ? 'Cover letter generated successfully' : 'Cover letter generation in progress'
      default:
        return 'Analysis completed'
    }
  }
}

// Export functions directly for easier usage
export async function getUserSessions(userId: string, limit: number = 20, offset: number = 0) {
  const supabase = await createClient()

  try {
    // Fetch sessions with related documents
    const { data: sessions, error, count } = await supabase
      .from('sessions')
      .select(`
        id,
        user_id,
        current_stage,
        state,
        created_at,
        updated_at,
        completed_at,
        job_description_id,
        analysis_type,
        documents!documents_session_id_fkey (
          id,
          document_type,
          original_filename,
          file_format,
          file_path
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching sessions:', error)
      throw new Error(`Failed to fetch session history: ${error.message || 'Unknown error'}`)
    }

    // Get result counts for each session
    const sessionsWithCounts = await Promise.all(
      (sessions || []).map(async (session) => {
        const [skillGapsResult, interviewQuestionsResult, coverLettersResult, messagesResult] = await Promise.all([
          supabase
            .from('skill_gaps')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('user_id', userId),
          supabase
            .from('interview_questions')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('user_id', userId),
          supabase
            .from('cover_letters')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('user_id', userId),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', session.id)
        ])

        return {
          id: session.id,
          userId: userId, // Add the userId to satisfy the TypeScript interface
          currentStage: session.current_stage,
          state: session.state,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          completedAt: session.completed_at,
          jobDescriptionId: session.job_description_id,
          analysisType: session.analysis_type,
          documents: session.documents?.map((doc: any) => ({
            id: doc.id,
            documentType: doc.document_type,
            originalFilename: doc.original_filename,
            fileFormat: doc.file_format || 'unknown',
            filePath: doc.file_path
          })),
          resultCounts: {
            skillGaps: skillGapsResult.count || 0,
            interviewQuestions: interviewQuestionsResult.count || 0,
            coverLetters: coverLettersResult.count || 0,
            messages: messagesResult.count || 0,
          }
        }
      })
    )

    return {
      sessions: sessionsWithCounts,
      hasMore: sessionsWithCounts.length === limit,
      total: count || 0
    }
  } catch (error) {
    console.error('Error in getUserSessions:', error)
    throw error
  }
}

export async function getSessionDetails(sessionId: string, userId: string) {
  const supabase = await createClient()

  try {
    // Fetch session with documents
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
        analysis_type,
        documents!documents_session_id_fkey (
          id,
          document_type,
          original_filename,
          file_format,
          file_path,
          parsed_content
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (sessionError || !session) {
      throw new Error('Session not found or access denied')
    }

    // Fetch detailed results
    const [skillGapsResult, interviewQuestionsResult, coverLettersResult, messagesResult] = await Promise.all([
      supabase
        .from('skill_gaps')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('interview_questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('order_index', { ascending: true }),
      supabase
        .from('cover_letters')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
    ])

    return {
      ...session,
      results: {
        skillGaps: skillGapsResult.data || [],
        interviewQuestions: interviewQuestionsResult.data || [],
        coverLetter: coverLettersResult.data,
        messages: messagesResult.data || []
      }
    }
  } catch (error) {
    console.error('Error in getSessionDetails:', error)
    throw error
  }
}

// Helper function to convert raw document data to SessionDocument interface
function mapDocumentData(rawDoc: RawDocumentData): SessionDocument {
  return {
    id: rawDoc.id,
    documentType: rawDoc.document_type as 'cv' | 'jd' | 'cover_letter',
    originalFilename: rawDoc.original_filename,
    fileFormat: rawDoc.file_format || 'unknown',
    filePath: rawDoc.file_path
  }
}

// Helper function to create session summary
export function createSessionSummary(session: any): SessionSummary {
  const cvDocument = session.documents?.find((doc: any) => doc.document_type === 'cv')
  const jdDocument = session.documents?.find((doc: any) => doc.document_type === 'jd')

  // Determine session status
  let status: 'completed' | 'processing' | 'failed' = 'processing'
  if (session.completed_at) {
    status = 'completed'
  } else if (session.state?.error) {
    status = 'failed'
  }

  // Create display name for analysis type
  const stageDisplay = getStageDisplayName(session.current_stage)

  // Create result summary
  const resultSummary = createResultSummary(session.current_stage, session.resultCounts)

  return {
    id: session.id,
    analysisType: session.analysis_type || 'general',
    stageDisplay,
    createdAt: session.created_at,
    status,
    cvDocument: cvDocument ? {
      id: cvDocument.id,
      documentType: cvDocument.document_type,
      originalFilename: cvDocument.original_filename,
      fileFormat: cvDocument.file_format || 'unknown',
      filePath: cvDocument.file_path
    } : undefined,
    jdDocument: jdDocument ? {
      id: jdDocument.id,
      documentType: jdDocument.document_type,
      originalFilename: jdDocument.original_filename,
      fileFormat: jdDocument.file_format || 'unknown',
      filePath: jdDocument.file_path
    } : undefined,
    resultSummary
  }
}

function getStageDisplayName(stage: string | null): string {
  if (!stage) return 'Unknown'

  const stageNames: Record<string, string> = {
    'cv_analysis': 'CV Analysis',
    'skill_gap': 'Skill Gap Analysis',
    'interview_preparation': 'Interview Preparation',
    'generating_cover_letter': 'Cover Letter Generation',
    'skill-gap': 'Skill Gap Analysis'
  }

  return stageNames[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function createResultSummary(stage: string | null, counts: SessionResultCounts): string {
  if (!stage) return 'No results available'

  switch (stage) {
    case 'cv_analysis':
      return 'Analysis completed with improvement suggestions'
    case 'skill_gap':
    case 'skill-gap':
      return `${counts.skillGaps} skills identified for development`
    case 'interview_preparation':
      return `${counts.interviewQuestions} practice questions generated`
    case 'generating_cover_letter':
      return counts.coverLetters > 0 ? 'Cover letter generated successfully' : 'Cover letter generation in progress'
    default:
      return 'Analysis completed'
  }
}