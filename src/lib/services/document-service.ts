import { SupabaseClient } from '@supabase/supabase-js'
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { randomUUID } from "crypto"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
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
  constructor(private supabase: SupabaseClient) {}

  /**
   * Upload a document to Supabase Storage and create database record
   */
  async uploadDocument(options: UploadOptions): Promise<UploadResult> {
    const { userId, file, documentType, sessionId } = options

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed')
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}-${randomUUID()}.${fileExt}`

    try {
      // Upload file to Supabase Storage
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Parse document content (for PDFs)
      let parsedContent = null
      if (file.type === 'application/pdf') {
        parsedContent = await this.parsePDF(buffer)
      }

      // Create document record in database
      const { data: document, error: dbError } = await this.supabase
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

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await this.supabase.storage.from('documents').remove([fileName])
        throw new Error(`Failed to create document record: ${dbError.message}`)
      }

      return {
        documentId: document.id,
        filePath: uploadData.path,
        parsedContent,
      }
    } catch (error) {
      // Attempt cleanup on error
      try {
        await this.supabase.storage.from('documents').remove([fileName])
      } catch (cleanupError) {
        console.error('Failed to clean up file after error:', cleanupError)
      }

      throw error
    }
  }

  /**
   * Parse PDF file using LangChain PDFLoader
   */
  private async parsePDF(buffer: Buffer): Promise<any> {
    let tempFilePath: string | null = null

    try {
      // Create temporary file
      const tempFileName = `pdf-${randomUUID()}.pdf`
      tempFilePath = join(tmpdir(), tempFileName)

      // Write buffer to temporary file
      await writeFile(tempFilePath, buffer)

      // Load PDF using LangChain PDFLoader
      const loader = new PDFLoader(tempFilePath)
      const docs = await loader.load()

      // Extract text from all pages
      const pages = docs.map((doc, index) => ({
        pageNumber: index + 1,
        content: doc.pageContent,
        metadata: doc.metadata,
      }))

      const fullText = docs.map(doc => doc.pageContent).join('\n\n')

      return {
        pageCount: docs.length,
        pages,
        fullText,
        extractedAt: new Date().toISOString(),
      }
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          await unlink(tempFilePath)
        } catch (cleanupError) {
          console.error('Failed to clean up temp PDF file:', cleanupError)
        }
      }
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
    // Get document to verify ownership and get file path
    const document = await this.getDocument(documentId, userId)

    // Delete file from storage
    const { error: storageError } = await this.supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete document record
    const { error: dbError } = await this.supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)

    if (dbError) {
      throw new Error(`Failed to delete document: ${dbError.message}`)
    }

    return { success: true }
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
