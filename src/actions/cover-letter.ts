'use server'

import { createClient } from '@/lib/supabase/server'
import { generateCoverLetter as generateCoverLetterWithLLM } from '@/lib/services/cover-letter-service'
import { DocumentService } from '@/lib/services/document-service'

interface CoverLetterParams {
  fileName: string
  fileType: string
  fileSize: number
  fileData: string // base64 encoded (empty if using existing document)
  documentId?: string // If provided, use existing document instead of uploading
  jobDescription: string
  companyName: string
  positionTitle: string
  hiringManagerName?: string
}

export async function generateCoverLetter(params: CoverLetterParams) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Unauthorized. Please log in.' }
    }

    // Validate required fields
    if (!params.documentId && (!params.fileName || !params.fileData)) {
      return { error: 'CV file or document ID is required' }
    }

    if (!params.jobDescription || !params.companyName || !params.positionTitle) {
      return { error: 'Missing required fields (job description, company name, or position title)' }
    }

    // Create a session for this cover letter generation
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        current_stage: 'generating_cover_letter',
        state: {
          workflowType: 'cover_letter',
          status: 'processing',
          companyName: params.companyName,
          positionTitle: params.positionTitle
        }
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Session creation error:', sessionError)
      return { error: sessionError?.message || 'Failed to create session' }
    }

    let cvDocumentId: string

    // Use existing document or upload new one
    if (params.documentId) {
      console.log('Using existing document:', params.documentId)

      // Verify document exists and belongs to user
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('id', params.documentId)
        .eq('user_id', user.id)
        .single()

      if (docError || !document) {
        return { error: 'Document not found or access denied' }
      }

      cvDocumentId = params.documentId
    } else {
      console.log('Uploading new document')

      // Validate file size (10MB limit)
      if (params.fileSize > 10 * 1024 * 1024) {
        return { error: 'File size exceeds 10MB limit' }
      }

      // Convert base64 back to File for upload
      const buffer = Buffer.from(params.fileData, 'base64')

      // Create a proper File-like object with all necessary properties
      const file = new File([buffer], params.fileName, { type: params.fileType })
      // Manually set size property for Node.js environment
      Object.defineProperty(file, 'size', {
        value: params.fileSize,
        writable: false
      })

      // Upload and parse CV
      const documentService = new DocumentService(supabase)
      const uploadResult = await documentService.uploadDocument({
        userId: user.id,
        file: file,
        documentType: 'cv',
        sessionId: session.id
      })

      if (!uploadResult.documentId) {
        return { error: 'Failed to upload CV' }
      }

      cvDocumentId = uploadResult.documentId
    }

    // Fetch CV content from document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('parsed_content')
      .eq('id', cvDocumentId)
      .single()

    if (docError || !doc?.parsed_content) {
      return { error: 'Failed to fetch CV content' }
    }

    const cvContent = doc.parsed_content

    // Extract fullText from parsed content object (for PDFs)
    // parsePDF returns: { pageCount, pages, fullText, extractedAt }
    let cvText: string
    if (typeof cvContent === 'object' && cvContent.fullText) {
      cvText = cvContent.fullText
    } else if (typeof cvContent === 'string') {
      cvText = cvContent
    } else {
      return { error: 'Invalid CV content format' }
    }

    // Generate cover letter using LLM
    const result = await generateCoverLetterWithLLM({
      cvContent: cvText,
      jobDescription: params.jobDescription,
      companyName: params.companyName,
      positionTitle: params.positionTitle,
      hiringManagerName: params.hiringManagerName || undefined
    })

    // Save the cover letter to the database
    const { data: coverLetterRecord, error: insertError } = await supabase
      .from('cover_letters')
      .insert({
        session_id: session.id,
        user_id: user.id,
        cv_document_id: cvDocumentId,
        content: result.coverLetter,
        version: '1',
        metadata: {
          companyName: params.companyName,
          positionTitle: params.positionTitle,
          jobDescription: params.jobDescription,
          hiringManagerName: params.hiringManagerName,
          generatedAt: result.metadata.generatedAt
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving cover letter:', insertError)
      // Still return the cover letter even if save fails
    }

    // Update session state to completed
    await supabase
      .from('sessions')
      .update({
        current_stage: 'completed',
        state: {
          workflowType: 'cover_letter',
          status: 'completed',
          companyName: params.companyName,
          positionTitle: params.positionTitle,
          result: {
            coverLetterId: coverLetterRecord?.id,
            documentId: cvDocumentId
          }
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', session.id)

    return {
      success: true,
      coverLetter: result.coverLetter,
      coverLetterId: coverLetterRecord?.id,
      documentId: cvDocumentId,
      sessionId: session.id
    }
  } catch (error) {
    console.error('Error generating cover letter:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to generate cover letter'
    }
  }
}

export async function getCoverLetterHistory(limit = 10) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { error: error.message }
    }

    return { success: true, coverLetters: data }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch cover letter history'
    }
  }
}

export async function getCoverLetter(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return { error: error.message }
    }

    return { success: true, coverLetter: data }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch cover letter'
    }
  }
}
