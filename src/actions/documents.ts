'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DocumentType } from '@/lib/types'
import { DocumentParser } from '@/lib/services/document-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const file = formData.get('file') as File
  const jdText = formData.get('jdText') as string
  const documentType = formData.get('documentType') as DocumentType
  const sessionId = formData.get('sessionId') as string | null

  // Handle text input for Job Descriptions
  if (documentType === 'jd' && jdText) {
    if (!jdText.trim()) {
      return { error: 'Job description text cannot be empty' }
    }

    try {
      // Create document record for text-based JD
      const parsedContent = {
        fullText: jdText.trim(),
        pageCount: 0,
        wordCount: jdText.trim().split(/\s+/).length,
        sections: {},
      }

      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          document_type: documentType,
          original_filename: `Job Description - ${new Date().toLocaleDateString()}`,
          file_path: null, // No file for text input
          file_format: 'txt',
          parsed_content: parsedContent,
          metadata: {
            source: 'text_input',
            wordCount: parsedContent.wordCount,
          },
        })
        .select()
        .single()

      if (dbError) {
        return { error: `Failed to create document record: ${dbError.message}` }
      }

      revalidatePath('/dashboard')
      revalidatePath('/workflow')
      revalidatePath('/documents')

      return { success: true, document }
    } catch (error: any) {
      return { error: error.message || 'An unexpected error occurred' }
    }
  }

  // Handle file upload
  if (!file) {
    return { error: 'No file provided' }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File size exceeds 10MB limit' }
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { error: 'Invalid file type. Only PDF, DOCX, and TXT files are allowed' }
  }

  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

    // Convert file to buffer for parsing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse document content
    const parser = new DocumentParser()
    let parsedContent = null
    try {
      const parsed = await parser.parseDocument(buffer, fileExt || 'pdf')
      parsedContent = {
        fullText: parsed.text,
        pageCount: parsed.metadata?.pages || 0,
        wordCount: parsed.metadata?.wordCount || 0,
        sections: parser.extractCVSections(parsed.text),
      }
    } catch (parseError) {
      console.error('Document parsing failed:', parseError)
      // Continue with upload even if parsing fails
      parsedContent = {
        fullText: 'Parsing failed',
        pageCount: 0,
        wordCount: 0,
        sections: {},
      }
    }

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` }
    }

    // Create document record in database with parsed content
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        document_type: documentType,
        original_filename: file.name,
        file_path: uploadData.path,
        file_format: fileExt,
        parsed_content: parsedContent,
        metadata: {
          size: file.size,
          mimeType: file.type,
        },
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([fileName])
      return { error: `Failed to create document record: ${dbError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/workflow')
    revalidatePath('/documents')

    return { success: true, document }
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' }
  }
}

export async function getUserDocuments(documentType?: DocumentType) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  try {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    const { data: documents, error: dbError } = await query

    if (dbError) {
      return { error: `Failed to fetch documents: ${dbError.message}` }
    }

    return { success: true, documents: documents || [] }
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' }
  }
}

export async function getDocumentById(documentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  try {
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (dbError || !document) {
      return { error: 'Document not found' }
    }

    return { success: true, document }
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' }
  }
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  try {
    // Get document to verify ownership and get file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path, user_id')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return { error: 'Document not found' }
    }

    if (document.user_id !== user.id) {
      return { error: 'Unauthorized to delete this document' }
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete document record
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      return { error: `Failed to delete document: ${dbError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/workflow')
    revalidatePath('/history')

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred' }
  }
}
