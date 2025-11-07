/**
 * Document Repository
 *
 * Handles all document-related data access operations with
 * proper separation of concerns and file management.
 */

import { DatabaseClient } from '@/lib/types/database'
import { BaseRepository, IBaseRepository } from './base.repository'

/**
 * Document entity interface
 */
export interface Document {
  id: string
  user_id: string
  title: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  content_type: 'cv' | 'resume' | 'cover_letter' | 'job_description' | 'other'
  status: 'uploaded' | 'processing' | 'processed' | 'error'
  parsed_content?: {
    fullText: string
    pageCount?: number
    wordCount?: number
    sections?: Record<string, string>
  }
  metadata?: Record<string, any>
  embedding_id?: string
  created_at: string
  updated_at: string
  processed_at?: string
}

/**
 * Document version interface
 */
export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  title: string
  file_name: string
  file_path: string
  file_size: number
  parsed_content?: any
  change_summary?: string
  created_by: string
  created_at: string
}

/**
 * Document analysis interface
 */
export interface DocumentAnalysis {
  id: string
  document_id: string
  analysis_type: 'cv_analysis' | 'skill_gap' | 'job_match' | 'content_extraction'
  result: any
  confidence_score?: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Repository interface for document operations
 */
export interface IDocumentRepository extends IBaseRepository<Document, string> {
  /** Find documents by user ID */
  findByUserId(userId: string, options?: {
    contentType?: Document['content_type']
    status?: Document['status']
    limit?: number
    offset?: number
  }): Promise<Document[]>

  /** Find documents by user with pagination */
  findByUserIdWithPagination(
    userId: string,
    page: number,
    limit: number,
    options?: {
      contentType?: Document['content_type']
      status?: Document['status']
    }
  ): Promise<{
    items: Document[]
    total: number
    page: number
    limit: number
    totalPages: number
  }>

  /** Find documents by content type */
  findByContentType(contentType: Document['content_type'], userId?: string): Promise<Document[]>

  /** Find documents by status */
  findByStatus(status: Document['status'], userId?: string): Promise<Document[]>

  /** Update document status */
  updateStatus(documentId: string, status: Document['status'], error?: string): Promise<boolean>

  /** Update parsed content */
  updateParsedContent(documentId: string, content: Document['parsed_content']): Promise<boolean>

  /** Update embedding ID */
  updateEmbeddingId(documentId: string, embeddingId: string): Promise<boolean>

  /** Get document statistics */
  getDocumentStats(userId: string): Promise<{
    totalDocuments: number
    documentsByType: Record<Document['content_type'], number>
    documentsByStatus: Record<Document['status'], number>
    totalFileSize: number
    averageDocumentSize: number
  }>

  /** Search documents by content */
  searchByContent(userId: string, query: string, limit?: number): Promise<Document[]>

  /** Get recently processed documents */
  getRecentlyProcessed(userId: string, limit?: number): Promise<Document[]>

  /** Get documents with embeddings */
  getDocumentsWithEmbeddings(userId: string): Promise<Document[]>

  /** Create document version */
  createVersion(documentId: string, version: Omit<DocumentVersion, 'id' | 'created_at'>): Promise<DocumentVersion>

  /** Get document versions */
  getVersions(documentId: string): Promise<DocumentVersion[]>

  /** Save analysis result */
  saveAnalysis(analysis: Omit<DocumentAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentAnalysis>

  /** Get document analyses */
  getAnalyses(documentId: string, analysisType?: DocumentAnalysis['analysis_type']): Promise<DocumentAnalysis[]>

  /** Delete document and all related data */
  deleteDocumentComplete(documentId: string): Promise<boolean>

  /** Get storage usage statistics */
  getStorageUsage(userId: string): Promise<{
    totalFiles: number
    totalSize: number
    sizeByType: Record<Document['content_type'], number>
  }>
}

/**
 * Document repository implementation
 */
export class DocumentRepository extends BaseRepository<Document, string> implements IDocumentRepository {
  constructor(db: DatabaseClient) {
    super(db, 'documents', 'id')
  }

  /**
   * Find documents by user ID
   */
  async findByUserId(userId: string, options: {
    contentType?: Document['content_type']
    status?: Document['status']
    limit?: number
    offset?: number
  } = {}): Promise<Document[]> {
    const conditions: string[] = ['user_id = $1']
    const params: any[] = [userId]
    let paramIndex = 2

    if (options.contentType) {
      conditions.push(`content_type = $${paramIndex}`)
      params.push(options.contentType)
      paramIndex++
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(options.status)
      paramIndex++
    }

    let sql = `
      SELECT * FROM ${this.getTable()}
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
    `

    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`
      params.push(options.limit)
      paramIndex++
    }

    if (options.offset) {
      sql += ` OFFSET $${paramIndex}`
      params.push(options.offset)
    }

    return this.db.query<Document>(sql, params)
  }

  /**
   * Find documents by user with pagination
   */
  async findByUserIdWithPagination(
    userId: string,
    page: number,
    limit: number,
    options: {
      contentType?: Document['content_type']
      status?: Document['status']
    } = {}
  ) {
    const offset = (page - 1) * limit

    // Get total count
    const conditions: string[] = ['user_id = $1']
    const countParams: any[] = [userId]
    let paramIndex = 2

    if (options.contentType) {
      conditions.push(`content_type = $${paramIndex}`)
      countParams.push(options.contentType)
      paramIndex++
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex}`)
      countParams.push(options.status)
      paramIndex++
    }

    const countSql = `SELECT COUNT(*) as count FROM ${this.getTable()} WHERE ${conditions.join(' AND ')}`
    const countResult = await this.db.query<{ count: number }>(countSql, countParams)
    const total = countResult[0]?.count || 0

    // Get items
    const items = await this.findByUserId(userId, {
      ...options,
      limit,
      offset,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    }
  }

  /**
   * Find documents by content type
   */
  async findByContentType(contentType: Document['content_type'], userId?: string): Promise<Document[]> {
    const conditions: string[] = ['content_type = $1']
    const params: any[] = [contentType]

    if (userId) {
      conditions.push('user_id = $2')
      params.push(userId)
    }

    const sql = `
      SELECT * FROM ${this.getTable()}
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
    `

    return this.db.query<Document>(sql, params)
  }

  /**
   * Find documents by status
   */
  async findByStatus(status: Document['status'], userId?: string): Promise<Document[]> {
    const conditions: string[] = ['status = $1']
    const params: any[] = [status]

    if (userId) {
      conditions.push('user_id = $2')
      params.push(userId)
    }

    const sql = `
      SELECT * FROM ${this.getTable()}
      WHERE ${conditions.join(' AND ')}
      ORDER BY updated_at DESC
    `

    return this.db.query<Document>(sql, params)
  }

  /**
   * Update document status
   */
  async updateStatus(documentId: string, status: Document['status'], error?: string): Promise<boolean> {
    const updates: string[] = ['status = $2', 'updated_at = CURRENT_TIMESTAMP']
    const params: any[] = [documentId, status]

    if (status === 'processed') {
      updates.push('processed_at = CURRENT_TIMESTAMP')
    }

    if (error) {
      updates.push('metadata = jsonb_set(COALESCE(metadata, \'{}\'), \'{error}\', $3)')
      params.push(error)
    }

    const sql = `
      UPDATE ${this.getTable()}
      SET ${updates.join(', ')}
      WHERE id = $1
    `

    const results = await this.db.query<{ rowCount: number }>(sql, params)
    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Update parsed content
   */
  async updateParsedContent(documentId: string, content: Document['parsed_content']): Promise<boolean> {
    const sql = `
      UPDATE ${this.getTable()}
      SET parsed_content = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `

    const results = await this.db.query<{ rowCount: number }>(sql, [documentId, content])
    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Update embedding ID
   */
  async updateEmbeddingId(documentId: string, embeddingId: string): Promise<boolean> {
    const sql = `
      UPDATE ${this.getTable()}
      SET embedding_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `

    const results = await this.db.query<{ rowCount: number }>(sql, [documentId, embeddingId])
    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId: string): Promise<{
    totalDocuments: number
    documentsByType: Record<Document['content_type'], number>
    documentsByStatus: Record<Document['status'], number>
    totalFileSize: number
    averageDocumentSize: number
  }> {
    const sql = `
      SELECT
        COUNT(*) as total_documents,
        SUM(file_size) as total_file_size,
        AVG(file_size) as average_document_size,
        COUNT(CASE WHEN content_type = 'cv' THEN 1 END) as cv_count,
        COUNT(CASE WHEN content_type = 'resume' THEN 1 END) as resume_count,
        COUNT(CASE WHEN content_type = 'cover_letter' THEN 1 END) as cover_letter_count,
        COUNT(CASE WHEN content_type = 'job_description' THEN 1 END) as job_description_count,
        COUNT(CASE WHEN content_type = 'other' THEN 1 END) as other_count,
        COUNT(CASE WHEN status = 'uploaded' THEN 1 END) as uploaded_count,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
        COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_count,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
      FROM ${this.getTable()}
      WHERE user_id = $1
    `

    const results = await this.db.query(sql, [userId])

    if (results.length === 0) {
      return {
        totalDocuments: 0,
        documentsByType: {
          cv: 0,
          resume: 0,
          cover_letter: 0,
          job_description: 0,
          other: 0,
        },
        documentsByStatus: {
          uploaded: 0,
          processing: 0,
          processed: 0,
          error: 0,
        },
        totalFileSize: 0,
        averageDocumentSize: 0,
      }
    }

    const row = results[0]

    return {
      totalDocuments: parseInt(row.total_documents) || 0,
      documentsByType: {
        cv: parseInt(row.cv_count) || 0,
        resume: parseInt(row.resume_count) || 0,
        cover_letter: parseInt(row.cover_letter_count) || 0,
        job_description: parseInt(row.job_description_count) || 0,
        other: parseInt(row.other_count) || 0,
      },
      documentsByStatus: {
        uploaded: parseInt(row.uploaded_count) || 0,
        processing: parseInt(row.processing_count) || 0,
        processed: parseInt(row.processed_count) || 0,
        error: parseInt(row.error_count) || 0,
      },
      totalFileSize: parseInt(row.total_file_size) || 0,
      averageDocumentSize: parseFloat(row.average_document_size) || 0,
    }
  }

  /**
   * Search documents by content
   */
  async searchByContent(userId: string, query: string, limit: number = 10): Promise<Document[]> {
    const sql = `
      SELECT * FROM ${this.getTable()}
      WHERE user_id = $1
      AND (
        title ILIKE $2
        OR file_name ILIKE $2
        OR parsed_content->>'fullText' ILIKE $2
      )
      ORDER BY updated_at DESC
      LIMIT $3
    `

    const searchQuery = `%${query}%`
    return this.db.query<Document>(sql, [userId, searchQuery, limit])
  }

  /**
   * Get recently processed documents
   */
  async getRecentlyProcessed(userId: string, limit: number = 5): Promise<Document[]> {
    const sql = `
      SELECT * FROM ${this.getTable()}
      WHERE user_id = $1
      AND status = 'processed'
      ORDER BY processed_at DESC NULLS LAST
      LIMIT $2
    `

    return this.db.query<Document>(sql, [userId, limit])
  }

  /**
   * Get documents with embeddings
   */
  async getDocumentsWithEmbeddings(userId: string): Promise<Document[]> {
    const sql = `
      SELECT * FROM ${this.getTable()}
      WHERE user_id = $1
      AND embedding_id IS NOT NULL
      AND status = 'processed'
      ORDER BY updated_at DESC
    `

    return this.db.query<Document>(sql, [userId])
  }

  /**
   * Create document version
   */
  async createVersion(documentId: string, version: Omit<DocumentVersion, 'id' | 'created_at'>): Promise<DocumentVersion> {
    // Get current version number
    const latestVersion = await this.db.query<{ version_number: number }>(
      'SELECT MAX(version_number) as version_number FROM document_versions WHERE document_id = $1',
      [documentId]
    )

    const nextVersion = (latestVersion[0]?.version_number || 0) + 1

    const sql = `
      INSERT INTO document_versions (document_id, version_number, title, file_name, file_path, file_size, change_summary, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const params = [
      documentId,
      nextVersion,
      version.title,
      version.file_name,
      version.file_path,
      version.file_size,
      version.change_summary,
      version.created_by,
    ]

    const results = await this.db.query<DocumentVersion>(sql, params)

    if (results.length === 0) {
      throw new Error('Failed to create document version')
    }

    return results[0]
  }

  /**
   * Get document versions
   */
  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    const sql = `
      SELECT * FROM document_versions
      WHERE document_id = $1
      ORDER BY version_number DESC
    `

    return this.db.query<DocumentVersion>(sql, [documentId])
  }

  /**
   * Save analysis result
   */
  async saveAnalysis(analysis: Omit<DocumentAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentAnalysis> {
    const sql = `
      INSERT INTO document_analyses (document_id, analysis_type, result, confidence_score, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const params = [
      analysis.document_id,
      analysis.analysis_type,
      analysis.result,
      analysis.confidence_score,
      analysis.metadata,
    ]

    const results = await this.db.query<DocumentAnalysis>(sql, params)

    if (results.length === 0) {
      throw new Error('Failed to save document analysis')
    }

    return results[0]
  }

  /**
   * Get document analyses
   */
  async getAnalyses(documentId: string, analysisType?: DocumentAnalysis['analysis_type']): Promise<DocumentAnalysis[]> {
    let sql = `
      SELECT * FROM document_analyses
      WHERE document_id = $1
    `
    const params: any[] = [documentId]

    if (analysisType) {
      sql += ' AND analysis_type = $2'
      params.push(analysisType)
    }

    sql += ' ORDER BY created_at DESC'

    return this.db.query<DocumentAnalysis>(sql, params)
  }

  /**
   * Delete document and all related data
   */
  async deleteDocumentComplete(documentId: string): Promise<boolean> {
    return this.db.transaction(async (client) => {
      try {
        // Delete analyses
        await client.query('DELETE FROM document_analyses WHERE document_id = $1', [documentId])

        // Delete versions
        await client.query('DELETE FROM document_versions WHERE document_id = $1', [documentId])

        // Delete embedding if exists
        await client.query('DELETE FROM cv_embeddings WHERE document_id = $1', [documentId])

        // Delete document
        const result = await client.query<{ rowCount: number }>(
          'DELETE FROM documents WHERE id = $1',
          [documentId]
        )

        return (result[0]?.rowCount || 0) > 0
      } catch (error) {
        throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
  }

  /**
   * Get storage usage statistics
   */
  async getStorageUsage(userId: string): Promise<{
    totalFiles: number
    totalSize: number
    sizeByType: Record<Document['content_type'], number>
  }> {
    const sql = `
      SELECT
        COUNT(*) as total_files,
        SUM(file_size) as total_size,
        SUM(CASE WHEN content_type = 'cv' THEN file_size ELSE 0 END) as cv_size,
        SUM(CASE WHEN content_type = 'resume' THEN file_size ELSE 0 END) as resume_size,
        SUM(CASE WHEN content_type = 'cover_letter' THEN file_size ELSE 0 END) as cover_letter_size,
        SUM(CASE WHEN content_type = 'job_description' THEN file_size ELSE 0 END) as job_description_size,
        SUM(CASE WHEN content_type = 'other' THEN file_size ELSE 0 END) as other_size
      FROM ${this.getTable()}
      WHERE user_id = $1
    `

    const results = await this.db.query(sql, [userId])

    if (results.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        sizeByType: {
          cv: 0,
          resume: 0,
          cover_letter: 0,
          job_description: 0,
          other: 0,
        },
      }
    }

    const row = results[0]

    return {
      totalFiles: parseInt(row.total_files) || 0,
      totalSize: parseInt(row.total_size) || 0,
      sizeByType: {
        cv: parseInt(row.cv_size) || 0,
        resume: parseInt(row.resume_size) || 0,
        cover_letter: parseInt(row.cover_letter_size) || 0,
        job_description: parseInt(row.job_description_size) || 0,
        other: parseInt(row.other_size) || 0,
      },
    }
  }
}

/**
 * Create document repository instance
 */
export function createDocumentRepository(db: DatabaseClient): IDocumentRepository {
  return new DocumentRepository(db)
}