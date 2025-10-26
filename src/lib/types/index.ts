// Document types
export type DocumentType = 'cv' | 'jd' | 'cover_letter'
export type FileFormat = 'pdf' | 'docx' | 'txt'

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
