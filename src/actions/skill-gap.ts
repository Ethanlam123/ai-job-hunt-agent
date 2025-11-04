'use server'

import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { randomUUID } from "crypto"
import { createClient } from '@/lib/supabase/server'
import { SkillGapAgent } from '@/lib/agents/skill-gap-agent'
import { revalidatePath } from 'next/cache'

interface AnalyzeSkillGapInput {
  cvDocumentId?: string // If provided, use existing CV
  cvFileName?: string
  cvFileType?: string
  cvFileSize?: number
  cvFileData?: string // base64 (empty if using existing document)
  jobDescriptionText: string
  jdDocumentId?: string // If provided, use existing JD document
}

interface AnalyzeSkillGapOutput {
  success: boolean
  sessionId?: string
  analysis?: any
  error?: string
}

/**
 * Main skill gap analysis action
 * Supports both existing CV selection and new CV upload
 */
export async function analyzeSkillGaps(input: AnalyzeSkillGapInput): Promise<AnalyzeSkillGapOutput> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  let tempFilePath: string | null = null
  let documentId: string | undefined = input.cvDocumentId
  let jdDocumentId = input.jdDocumentId
  let jobDescriptionText = input.jobDescriptionText

  try {
    // Handle job description source
    if (jdDocumentId) {
      // Use existing JD document
      console.log('Using existing JD document:', jdDocumentId)

      // Verify JD document exists and belongs to user
      const { data: jdDocument, error: jdDocError } = await supabase
        .from('documents')
        .select('id, document_type, parsed_content')
        .eq('id', jdDocumentId)
        .eq('user_id', user.id)
        .single()

      if (jdDocError || !jdDocument) {
        return { success: false, error: 'Job description document not found or access denied' }
      }

      if (jdDocument.document_type !== 'jd') {
        return { success: false, error: 'Selected document is not a job description' }
      }

      // Extract job description text from document
      if (jdDocument.parsed_content?.fullText) {
        jobDescriptionText = jdDocument.parsed_content.fullText
      } else {
        return { success: false, error: 'Job description document has no content' }
      }
    } else {
      // Use provided job description text
      if (!jobDescriptionText || jobDescriptionText.trim().length < 10) {
        return { success: false, error: 'Job description is required and must be at least 10 characters long' }
      }
    }

    // Handle CV document
    if (documentId) {
      // Use existing CV document
      console.log('Using existing CV document:', documentId)

      // Verify document exists and belongs to user
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, document_type')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single()

      if (docError || !document) {
        return { success: false, error: 'CV document not found or access denied' }
      }

      if (document.document_type !== 'cv') {
        return { success: false, error: 'Selected document is not a CV' }
      }
    } else {
      // Upload new CV document
      console.log('Uploading new CV document')

      if (!input.cvFileName || !input.cvFileType || !input.cvFileSize || !input.cvFileData) {
        return { success: false, error: 'CV file information is required when not using existing document' }
      }

      // Validate file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024
      if (input.cvFileSize > MAX_SIZE) {
        return { success: false, error: 'CV file size exceeds 10MB limit' }
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      if (!allowedTypes.includes(input.cvFileType)) {
        return { success: false, error: 'Only PDF, DOCX, and TXT files are supported for CV' }
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.cvFileData, 'base64')

      // Generate unique file path
      const fileExt = input.cvFileName.split('.').pop()
      const storagePath = `${user.id}/${Date.now()}-${randomUUID()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: input.cvFileType,
          upsert: false,
        })

      if (uploadError) {
        return { success: false, error: `CV upload failed: ${uploadError.message}` }
      }

      // Parse document content based on type
      let parsedContent = null
      if (input.cvFileType === 'application/pdf') {
        const { PDFLoader } = await import("@langchain/community/document_loaders/fs/pdf")
        const tempFileName = `cv-${randomUUID()}.pdf`
        tempFilePath = join(tmpdir(), tempFileName)
        await writeFile(tempFilePath, buffer)

        const loader = new PDFLoader(tempFilePath)
        const docs = await loader.load()

        parsedContent = {
          pageCount: docs.length,
          fullText: docs.map(doc => doc.pageContent).join('\n\n'),
          pages: docs.map((doc, index) => ({
            pageNumber: index + 1,
            content: doc.pageContent,
          })),
          extractedAt: new Date().toISOString(),
        }
      } else if (input.cvFileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = await import('mammoth')
        const tempFileName = `cv-${randomUUID()}.docx`
        tempFilePath = join(tmpdir(), tempFileName)
        await writeFile(tempFilePath, buffer)

        const result = await mammoth.default.extractRawText({ path: tempFilePath })
        parsedContent = {
          pageCount: 1, // DOCX doesn't have pages in the same way
          fullText: result.value,
          extractedAt: new Date().toISOString(),
        }
      } else if (input.cvFileType === 'text/plain') {
        const textContent = buffer.toString('utf-8')
        parsedContent = {
          pageCount: 1,
          fullText: textContent,
          extractedAt: new Date().toISOString(),
        }
      }

      // Create document record in database
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_type: 'cv',
          original_filename: input.cvFileName,
          file_path: uploadData.path,
          file_format: fileExt,
          parsed_content: parsedContent,
          metadata: {
            size: input.cvFileSize,
            mimeType: input.cvFileType,
            uploadedAt: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('documents').remove([storagePath])
        return { success: false, error: `Failed to create CV document record: ${dbError.message}` }
      }

      documentId = document.id
    }

    // Create or get session for skill gap analysis
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        current_stage: 'skill_gap',
        state: {
          cvDocumentId: documentId,
          jdDocumentId: jdDocumentId,
          jobDescriptionText: jobDescriptionText,
        },
      })
      .select()
      .single()

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    // Initialize Skill Gap Agent
    const skillGapAgent = new SkillGapAgent(supabase)

    // Run skill gap analysis workflow
    if (!documentId) {
      return { success: false, error: 'CV document ID is required' }
    }
    const result = await skillGapAgent.analyzeSkillGaps(
      documentId,
      jobDescriptionText,
      session.id,
      user.id
    )

    // Revalidate paths
    revalidatePath('/skill-gap')
    revalidatePath(`/workflow/${session.id}`)

    return {
      success: !result.error,
      sessionId: session.id,
      analysis: result.gapAnalysis,
      error: result.error,
    }
  } catch (error: any) {
    console.error('Skill Gap Analysis Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to analyze skill gaps',
    }
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch (cleanupError) {
        console.error("Failed to clean up temp file:", cleanupError)
      }
    }
  }
}

/**
 * Get skill gap analysis results for a session
 */
export async function getSkillGapResults(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', results: null }
  }

  try {
    const skillGapAgent = new SkillGapAgent(supabase)
    const results = await skillGapAgent.getAnalysisResults(sessionId, user.id)

    return {
      success: results.success,
      results: results.data,
      error: results.error,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      results: null,
    }
  }
}

/**
 * Get skill gaps organized by timeline for display
 */
export async function getSkillGapsByTimeline(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', data: null }
  }

  try {
    const skillGapAgent = new SkillGapAgent(supabase)
    const result = await skillGapAgent.getSkillGapsByTimeline(sessionId, user.id)

    return {
      success: result.success,
      data: 'data' in result ? result.data : null,
      error: 'error' in result ? result.error : undefined,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      data: null,
    }
  }
}

/**
 * Update skill gap status (mark as in_progress, completed, etc.)
 */
export async function updateSkillGapStatus(
  skillGapId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'not_interested',
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const skillGapAgent = new SkillGapAgent(supabase)
    const result = await skillGapAgent.updateSkillGapStatus(
      skillGapId,
      user.id,
      status,
      notes
    )

    revalidatePath('/skill-gap')

    return {
      success: result.success,
      error: result.error,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Get skill gap statistics for a user
 */
export async function getSkillGapStats() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', stats: null }
  }

  try {
    const skillGapAgent = new SkillGapAgent(supabase)
    const result = await skillGapAgent.getSkillGapStats(user.id)

    return {
      success: result.success,
      stats: 'data' in result ? result.data : null,
      error: 'error' in result ? result.error : undefined,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stats: null,
    }
  }
}

/**
 * Get user's CV documents for selection
 */
export async function getUserCVDocuments() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', documents: [] }
  }

  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, original_filename, created_at, metadata')
      .eq('user_id', user.id)
      .eq('document_type', 'cv')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch CV documents: ${error.message}`)
    }

    return {
      success: true,
      documents: documents || [],
      error: null,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      documents: [],
    }
  }
}

/**
 * Get user's JD documents for selection
 */
export async function getUserJDDocuments() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', documents: [] }
  }

  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, original_filename, created_at, metadata')
      .eq('user_id', user.id)
      .eq('document_type', 'jd')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch JD documents: ${error.message}`)
    }

    return {
      success: true,
      documents: documents || [],
      error: null,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      documents: [],
    }
  }
}

/**
 * Validate job description quality before analysis
 */
export async function validateJobDescription(jobDescriptionText: string) {
  try {
    const supabase = await createClient()
    const { SkillGapService } = await import('@/lib/services/skill-gap-service')
    const skillGapService = new SkillGapService(supabase)

    const validation = skillGapService.validateJobDescriptionQuality(jobDescriptionText)

    return {
      success: true,
      validation,
      error: null,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      validation: null,
    }
  }
}