'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DocumentType, Document } from '@/lib/types'
import { DocumentParser } from '@/lib/services/document-parser'
import {
  validateFileSize,
  validateFileType,
  validateJDMetadata,
  generateStoragePath,
  generateJDFilename,
  fileToBuffer,
} from '@/lib/utils/document-utils'
import {
  getAuthenticatedUser,
  checkDuplicateDocumentName,
  cleanupUploadedFile,
  verifyAndFetchDocument,
} from '@/lib/utils/document-helpers'

export type DocumentUploadResult =
  | { success: true; document: Document }
  | { success: false; error: string; code?: string }

export async function uploadDocument(formData: FormData): Promise<DocumentUploadResult> {
  const { user, error: authError } = await getAuthenticatedUser()

  if (authError || !user) {
    return {
      success: false,
      error: 'Authentication required. Please log in to upload documents.',
      code: 'AUTH_REQUIRED',
    }
  }

  const file = formData.get('file') as File
  const jdText = formData.get('jdText') as string
  const documentType = formData.get('documentType') as DocumentType
  const sessionId = formData.get('sessionId') as string | null

  // JD metadata fields
  const companyName = formData.get('companyName') as string
  const positionName = formData.get('positionName') as string
  const hiringManagerName = formData.get('hiringManagerName') as string | null

  // Handle text input for Job Descriptions
  if (documentType === 'jd' && jdText) {
    const validation = validateJDMetadata(companyName, positionName)
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Validation failed' }
    }

    if (!jdText.trim()) {
      return { success: false, error: 'Job description text cannot be empty' }
    }

    const filename = generateJDFilename(companyName, positionName)
    const duplicateCheck = await checkDuplicateDocumentName(filename, documentType, user.id)
    if (duplicateCheck.error) {
      return { success: false, error: duplicateCheck.error }
    }

    const parsedContent = {
      fullText: jdText.trim(),
      pageCount: 0,
      wordCount: jdText.trim().split(/\s+/).length,
      sections: {},
    }

    const metadata: any = {
      source: 'text_input',
      wordCount: parsedContent.wordCount,
      companyName: companyName.trim(),
      positionName: positionName.trim(),
    }

    if (hiringManagerName?.trim()) {
      metadata.hiringManagerName = hiringManagerName.trim()
    }

    const supabase = await createClient()
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        document_type: documentType,
        original_filename: filename,
        file_path: null,
        file_format: 'txt',
        parsed_content: parsedContent,
        metadata,
      })
      .select()
      .single()

    if (dbError) {
      return { success: false, error: `Failed to create document record: ${dbError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/workflow')
    revalidatePath('/documents')

    return { success: true, document }
  }

  // Validate JD metadata for file uploads
  if (documentType === 'jd') {
    const validation = validateJDMetadata(companyName, positionName)
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Validation failed' }
    }
  }

  // Handle file upload
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file size
  const sizeValidation = validateFileSize(file.size)
  if (!sizeValidation.valid) {
    return { success: false, error: sizeValidation.error || 'Validation failed' }
  }

  // Validate file type
  const typeValidation = validateFileType(file.type)
  if (!typeValidation.valid) {
    return { success: false, error: typeValidation.error || 'Validation failed' }
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = generateStoragePath(user.id, file.name)
    const buffer = await fileToBuffer(file)

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
      parsedContent = {
        fullText: 'Parsing failed',
        pageCount: 0,
        wordCount: 0,
        sections: {},
      }
    }

    // Upload file to Supabase Storage
    const supabase = await createClient()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
        metadata: {
          uploadedBy: 'server-action',
          userId: user.id,
          originalName: file.name,
        },
      })

    if (uploadError) {
      console.error('Storage upload error:', { error: uploadError, fileName, userId: user.id })

      if (uploadError.message?.includes('Forbidden') || uploadError.message?.includes('403')) {
        return { success: false, error: 'Upload failed: Permission denied. Please ensure you are logged in and try again.' }
      } else if (uploadError.message?.includes('row-level security policy')) {
        return { success: false, error: 'Upload failed: Authentication required. Please log in again to upload files.' }
      } else if (uploadError.message?.includes('Bucket not found')) {
        return { success: false, error: 'Upload failed: Storage system is not properly configured. Please contact support.' }
      } else if (uploadError.message?.includes('File too large')) {
        return { success: false, error: 'Upload failed: File is too large. Maximum size is 10MB.' }
      } else if (uploadError.message?.includes('Invalid file type')) {
        return { success: false, error: `Upload failed: File type "${file.type}" is not supported. Allowed types: PDF, DOCX, TXT, and Markdown.` }
      }
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Determine filename and check for duplicates
    const filename = documentType === 'jd'
      ? generateJDFilename(companyName, positionName, file.name)
      : file.name

    const duplicateCheck = await checkDuplicateDocumentName(filename, documentType, user.id)
    if (duplicateCheck.error) {
      await cleanupUploadedFile(fileName)
      return { success: false, error: duplicateCheck.error }
    }

    // Create metadata
    const metadata: any = {
      size: file.size,
      mimeType: file.type,
    }

    if (documentType === 'jd') {
      metadata.companyName = companyName.trim()
      metadata.positionName = positionName.trim()
      if (hiringManagerName?.trim()) {
        metadata.hiringManagerName = hiringManagerName.trim()
      }
    }

    // Create document record
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
      await cleanupUploadedFile(fileName)
      return { success: false, error: `Failed to create document record: ${dbError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/workflow')
    revalidatePath('/documents')

    return { success: true, document }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function getUserDocuments(documentType?: DocumentType) {
  const { user, error: authError } = await getAuthenticatedUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()
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
      return { success: false, error: `Failed to fetch documents: ${dbError.message}` }
    }

    return { success: true, documents: documents || [] }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function getDocumentById(documentId: string) {
  const { user, error: authError } = await getAuthenticatedUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { document, error } = await verifyAndFetchDocument(documentId, user.id)

  if (error) {
    return { error }
  }

  return { success: true, document }
}

export async function renameDocument(documentId: string, newName: string) {
  const { user, error: authError } = await getAuthenticatedUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  const trimmedName = newName.trim()
  if (!trimmedName) {
    return { success: false, error: 'Document name cannot be empty' }
  }

  if (trimmedName.length > 100) {
    return { success: false, error: 'Document name must be 100 characters or less' }
  }

  try {
    const supabase = await createClient()
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('document_type')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !document) {
      return { success: false, error: 'Document not found' }
    }

    const duplicateCheck = await checkDuplicateDocumentName(
      trimmedName,
      document.document_type,
      user.id,
      documentId,
    )

    if (duplicateCheck.error) {
      return { success: false, error: duplicateCheck.error }
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({ original_filename: trimmedName })
      .eq('id', documentId)

    if (updateError) {
      return { success: false, error: `Failed to rename document: ${updateError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/workflow')
    revalidatePath('/documents')

    return { success: true, newName: trimmedName }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

export async function deleteDocument(documentId: string) {
  const { user, error: authError } = await getAuthenticatedUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const supabase = await createClient()
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path])

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError)
      }
    }

    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      return { success: false, error: `Failed to delete document: ${dbError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/workflow')
    revalidatePath('/history')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}
