/**
 * Document Service
 *
 * Handles document upload to Supabase Storage and database record creation.
 * Uses DocumentParser for content extraction to avoid duplication.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { DocumentParser } from './document-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/md',
]

export type DocumentType = 'cv' | 'jd' | 'cover_letter'

interface UploadOptions {
  userId: string
  file: File
  documentType: DocumentType
  sessionId?: string
}

interface UploadResult {
  documentId: string
  filePath: string
  parsedContent?: any
}

export class DocumentService {
  private parser: DocumentParser

  constructor(private supabase: SupabaseClient) {
    this.parser = new DocumentParser()
  }

  /**
   * Upload a document to Supabase Storage and create database record
   */
  async uploadDocument(options: UploadOptions): Promise<UploadResult> {
    const { userId, file, documentType, sessionId } = options

    this.validateFile(file)

    const fileExt = file.name.split('.').pop()
    const fileName = this.generateFileName(userId, fileExt)

    try {
      const buffer = await fileToBuffer(file)
      const uploadData = await this.uploadToStorage(fileName, buffer, file.type)
      const parsedContent = await this.parseContent(buffer, fileExt)

      const document = await this.createDatabaseRecord({
        userId,
        sessionId,
        documentType,
        file,
        fileName,
        fileExt,
        uploadData,
        parsedContent,
      })

      return {
        documentId: document.id,
        filePath: uploadData.path,
        parsedContent,
      }
    } catch (error) {
      await this.cleanupOnError(fileName)
      throw error
    }
  }

  /**
   * Validate file size and type
   */
  private validateFile(file: File): void {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed')
    }
  }

  /**
   * Generate unique file name
   */
  private generateFileName(userId: string, fileExt: string | undefined): string {
    return `${userId}/${Date.now()}-${randomUUID()}.${fileExt}`
  }

  /**
   * Upload file to Supabase Storage
   */
  private async uploadToStorage(fileName: string, buffer: Buffer, contentType: string) {
    const { data, error } = await this.supabase.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    return data
  }

  /**
   * Parse document content using DocumentParser
   */
  private async parseContent(buffer: Buffer, fileExt: string | undefined) {
    try {
      return await this.parser.parseDocument(buffer, fileExt || '')
    } catch {
      return null
    }
  }

  /**
   * Create database record
   */
  private async createDatabaseRecord(options: {
    userId: string
    sessionId?: string
    documentType: DocumentType
    file: File
    fileName: string
    fileExt: string | undefined
    uploadData: { path: string }
    parsedContent: any
  }) {
    const { userId, sessionId, documentType, file, fileName, fileExt, uploadData, parsedContent } =
      options

    const { data, error } = await this.supabase
      .from('documents')
      .insert({
        user_id: userId,
        session_id: sessionId || null,
        document_type: documentType,
        original_filename: file.name,
        file_path: uploadData.path,
        file_format: fileExt,
        parsed_content: parsedContent,
        metadata: {
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create document record: ${error.message}`)
    }

    return data
  }

  /**
   * Clean up file on error
   */
  private async cleanupOnError(fileName: string): Promise<void> {
    try {
      await this.supabase.storage.from('documents').remove([fileName])
    } catch (cleanupError) {
      console.error('Failed to clean up file after error:', cleanupError)
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch document: ${error.message}`)
    }

    return data
  }

  /**
   * Delete document and associated file
   */
  async deleteDocument(documentId: string, userId: string) {
    const document = await this.getDocument(documentId, userId)

    await this.deleteFromStorage(document.file_path)
    await this.deleteFromDatabase(documentId, userId)

    return { success: true }
  }

  /**
   * Delete file from storage
   */
  private async deleteFromStorage(filePath: string): Promise<void> {
    const { error } = await this.supabase.storage.from('documents').remove([filePath])

    if (error) {
      console.error('Failed to delete file from storage:', error)
    }
  }

  /**
   * Delete document from database
   */
  private async deleteFromDatabase(documentId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`)
    }
  }

  /**
   * Get document download URL
   */
  async getDownloadURL(documentId: string, userId: string, expiresIn: number = 3600) {
    const document = await this.getDocument(documentId, userId)

    const { data, error } = await this.supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, expiresIn)

    if (error) {
      throw new Error(`Failed to create download URL: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * List user documents
   */
  async listDocuments(userId: string, documentType?: DocumentType, sessionId?: string) {
    let query = this.supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to list documents: ${error.message}`)
    }

    return data
  }
}

/**
 * Convert File to Buffer
 */
async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
