// Document types (including legacy types from database)
export type DocumentType =
  | 'cv'
  | 'jd'
  | 'cover_letter'
  | 'job_description'
  | 'cover_letter_jd'
  | 'interview_jd'
  | 'skill_gap_jd'

export type FileFormat = 'pdf' | 'docx' | 'txt' | 'md'

/**
 * Shared Document interface used across components and actions
 * This matches the database schema for the documents table
 */
export interface Document {
  id: string
  user_id: string
  session_id?: string | null
  document_type: DocumentType
  original_filename: string
  file_path?: string | null
  file_format: FileFormat
  parsed_content?: ParsedDocumentContent | null
  metadata?: DocumentMetadata | null
  created_at: string
  updated_at?: string
}

/**
 * Parsed document content structure
 */
export interface ParsedDocumentContent {
  fullText: string
  pageCount?: number
  wordCount?: number
  sections?: Record<string, string>
}

/**
 * Document metadata stored in JSONB
 */
export interface DocumentMetadata {
  size?: number
  mimeType?: string
  source?: string
  companyName?: string
  positionName?: string
  hiringManagerName?: string
  uploadedAt?: string
  wordCount?: number
  [key: string]: any
}

// Legacy alias for compatibility
export interface UploadedDocument {
  id: string
  userId: string
  sessionId?: string
  documentType: DocumentType
  originalFilename: string
  filePath: string
  fileFormat: FileFormat
  createdAt: Date
}

// Session types
export type SessionStage =
  | 'upload'
  | 'cv_analysis'
  | 'cv_improvement'
  | 'cover_letter'
  | 'interview_prep'
  | 'skill_gap'
  | 'completed'

export interface Session {
  id: string
  userId: string
  currentStage: SessionStage
  state: Record<string, any>
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

// Task types
export type TaskType = 'cv_analysis' | 'cover_letter_generation' | 'interview_prep' | 'skill_gap_analysis'
export type TaskStatus = 'processing' | 'completed' | 'failed'

export interface Task {
  id: string
  sessionId: string
  taskType: TaskType
  status: TaskStatus
  result?: any
  errorMessage?: string
  createdAt: Date
  completedAt?: Date
}
