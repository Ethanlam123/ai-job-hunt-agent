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

  // JD metadata fields
  const companyName = formData.get('companyName') as string
  const positionName = formData.get('positionName') as string
  const hiringManagerName = formData.get('hiringManagerName') as string | null

  // Function to check for duplicate document names
  const checkDuplicateName = async (filename: string) => {
    const { data: existingDoc, error: duplicateError } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('document_type', documentType)
      .eq('original_filename', filename)
      .single()

    if (duplicateError && duplicateError.code !== 'PGRST116') { // PGRST116 means no rows returned
      return { error: `Error checking for duplicate names: ${duplicateError.message}` }
    }

    if (existingDoc) {
      return { error: `A document with this name already exists for this document type` }
    }

    return { success: true }
  }

  // Handle text input for Job Descriptions
  if (documentType === 'jd' && jdText) {
    if (!jdText.trim()) {
      return { error: 'Job description text cannot be empty' }
    }

    // Validate required JD metadata
    if (!companyName?.trim() || !positionName?.trim()) {
      return { error: 'Company name and position name are required for job descriptions' }
    }

    try {
      // Create document record for text-based JD
      const parsedContent = {
        fullText: jdText.trim(),
        pageCount: 0,
        wordCount: jdText.trim().split(/\s+/).length,
        sections: {},
      }

      // Create enhanced filename with company and position
      const filename = `${companyName.trim()} - ${positionName.trim()} - ${new Date().toLocaleDateString()}`

      // Check for duplicate names
      const duplicateCheck = await checkDuplicateName(filename)
      if (duplicateCheck.error) {
        return duplicateCheck
      }

      const metadata: any = {
        source: 'text_input',
        wordCount: parsedContent.wordCount,
        companyName: companyName.trim(),
        positionName: positionName.trim(),
      }

      // Add hiring manager if provided
      if (hiringManagerName?.trim()) {
        metadata.hiringManagerName = hiringManagerName.trim()
      }

      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          document_type: documentType,
          original_filename: filename,
          file_path: null, // No file for text input
          file_format: 'txt',
          parsed_content: parsedContent,
          metadata,
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

  // Validate JD metadata for file uploads
  if (documentType === 'jd' && (!companyName?.trim() || !positionName?.trim())) {
    return { error: 'Company name and position name are required for job descriptions' }
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

    // Create enhanced metadata
    const metadata: any = {
      size: file.size,
      mimeType: file.type,
    }

    // Determine filename and check for duplicates
    const filename = documentType === 'jd'
      ? `${companyName.trim()} - ${positionName.trim()} - ${file.name}`
      : file.name

    // Check for duplicate names
    const duplicateCheck = await checkDuplicateName(filename)
    if (duplicateCheck.error) {
      // Clean up uploaded file if duplicate found
      await supabase.storage.from('documents').remove([fileName])
      return duplicateCheck
    }

    // Add JD metadata if applicable
    if (documentType === 'jd') {
      metadata.companyName = companyName.trim()
      metadata.positionName = positionName.trim()
      if (hiringManagerName?.trim()) {
        metadata.hiringManagerName = hiringManagerName.trim()
      }
    }

    // Create document record in database with parsed content
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        document_type: documentType,
        original_filename: filename,
        file_path: uploadData.path,
        file_format: fileExt,
        parsed_content: parsedContent,
        metadata,
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

export async function renameDocument(documentId: string, newName: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // Validate new name
  const trimmedName = newName.trim()
  if (!trimmedName) {
    return { error: 'Document name cannot be empty' }
  }

  if (trimmedName.length > 100) {
    return { error: 'Document name must be 100 characters or less' }
  }

  try {
    // Get document to verify ownership and get document type
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('original_filename, document_type, user_id')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return { error: 'Document not found' }
    }

    if (document.user_id !== user.id) {
      return { error: 'Unauthorized to rename this document' }
    }

    // Check for duplicate names within the same document type
    const { data: existingDoc, error: duplicateError } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('document_type', document.document_type)
      .eq('original_filename', trimmedName)
      .neq('id', documentId) // Exclude current document from duplicate check
      .single()

    if (duplicateError && duplicateError.code !== 'PGRST116') { // PGRST116 means no rows returned
      return { error: 'Error checking for duplicate names' }
    }

    if (existingDoc) {
      return { error: 'A document with this name already exists for this document type' }
    }

    // Update document name
    const { error: updateError } = await supabase
      .from('documents')
      .update({ original_filename: trimmedName })
      .eq('id', documentId)

    if (updateError) {
      return { error: `Failed to rename document: ${updateError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/workflow')
    revalidatePath('/documents')

    return { success: true, newName: trimmedName }
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
