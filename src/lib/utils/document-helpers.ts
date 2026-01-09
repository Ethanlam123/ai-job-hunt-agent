/**
 * Document Helper Functions for Server Actions
 *
 * Shared functions for document fetching, validation, and operations
 * used across server actions to avoid code duplication.
 */

import { createClient } from '@/lib/supabase/server'
import type { Document } from '@/lib/types'

/**
 * Get authenticated user with error handling
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, error: 'Unauthorized' }
  }

  return { user, error: null }
}

/**
 * Verify document ownership and fetch document
 */
export async function verifyAndFetchDocument(
  documentId: string,
  userId: string,
  expectedType?: string
): Promise<{ document?: Document; error?: string }> {
  const supabase = await createClient()

  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single()

  if (docError || !document) {
    return { error: 'Document not found or access denied' }
  }

  if (expectedType && document.document_type !== expectedType) {
    return {
      error: `Expected ${expectedType} document, but got ${document.document_type}`,
    }
  }

  return { document }
}

/**
 * Check for duplicate document names
 */
export async function checkDuplicateDocumentName(
  filename: string,
  documentType: string,
  userId: string,
  excludeDocumentId?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  let query = supabase
    .from('documents')
    .select('id')
    .eq('user_id', userId)
    .eq('document_type', documentType)
    .eq('original_filename', filename)

  if (excludeDocumentId) {
    query = query.neq('id', excludeDocumentId)
  }

  const { data: existingDoc, error: duplicateError } = await query.single()

  if (duplicateError && duplicateError.code !== 'PGRST116') {
    // PGRST116 means no rows returned
    return { error: `Error checking for duplicate names: ${duplicateError.message}` }
  }

  if (existingDoc) {
    return { error: 'A document with this name already exists for this document type' }
  }

  return {}
}

/**
 * Cleanup uploaded file from storage
 */
export async function cleanupUploadedFile(filePath: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.storage.from('documents').remove([filePath])
  } catch (cleanupError) {
    console.error('Failed to clean up uploaded file:', cleanupError)
  }
}
