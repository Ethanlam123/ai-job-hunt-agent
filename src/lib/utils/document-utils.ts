/**
 * Shared Document Utilities
 *
 * Common document validation, processing, and helper functions
 * used across server actions and components.
 */

import type { DocumentType } from '@/lib/types'

/**
 * Document validation configuration
 */
export const DOCUMENT_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/md',
  ] as const,
  FILE_EXTENSIONS: ['pdf', 'docx', 'txt', 'md'] as const,
} as const

/**
 * Validate file size
 */
export function validateFileSize(fileSize: number): { valid: boolean; error?: string } {
  if (fileSize > DOCUMENT_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${DOCUMENT_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    }
  }
  return { valid: true }
}

/**
 * Validate file type
 */
export function validateFileType(mimeType: string): { valid: boolean; error?: string } {
  if (!DOCUMENT_CONFIG.ALLOWED_FILE_TYPES.includes(mimeType as any)) {
    return {
      valid: false,
      error: `Invalid file type "${mimeType}". Allowed: PDF, DOCX, TXT, and Markdown`,
    }
  }
  return { valid: true }
}

/**
 * Validate JD metadata fields
 */
export function validateJDMetadata(
  companyName: string,
  positionName: string,
): { valid: boolean; error?: string } {
  if (!companyName?.trim()) {
    return { valid: false, error: 'Company name is required for job descriptions' }
  }
  if (!positionName?.trim()) {
    return { valid: false, error: 'Position name is required for job descriptions' }
  }
  return { valid: true }
}

/**
 * Generate unique storage path for uploaded file
 */
export function generateStoragePath(userId: string, fileName: string): string {
  const fileExt = fileName.split('.').pop() || 'pdf'
  return `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`
}

/**
 * Generate JD filename with metadata
 */
export function generateJDFilename(
  companyName: string,
  positionName: string,
  originalFileName?: string,
): string {
  const date = new Date().toLocaleDateString()
  return originalFileName
    ? `${companyName.trim()} - ${positionName.trim()} - ${originalFileName}`
    : `${companyName.trim()} - ${positionName.trim()} - ${date}`
}

/**
 * Convert file to buffer
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Check if document is a job description
 */
export function isJobDescription(doc: { document_type: string; original_filename: string }): boolean {
  const filename = doc.original_filename.toLowerCase()
  const docType = doc.document_type

  const isJobDescType = docType === 'jd' || docType === 'job_description'
  const isJobDescFilename =
    filename.includes('job') ||
    filename.includes('position') ||
    filename.includes('role') ||
    filename.includes('description') ||
    filename.includes('posting') ||
    filename.includes('opportunity')
  const isFromOtherFeature =
    docType === 'cover_letter_jd' ||
    docType === 'interview_jd' ||
    docType === 'skill_gap_jd' ||
    docType === 'job_description'

  return isJobDescType || isJobDescFilename || isFromOtherFeature
}

/**
 * Get document source label
 */
export function getDocumentSource(doc: { document_type: string; original_filename: string }): string {
  const filename = doc.original_filename.toLowerCase()
  const docType = doc.document_type

  if (docType === 'jd' || docType === 'job_description') return 'Direct upload'
  if (docType === 'cover_letter_jd') return 'From cover letters'
  if (docType === 'interview_jd') return 'From interview prep'
  if (docType === 'skill_gap_jd') return 'From skill analysis'
  if (filename.includes('job') || filename.includes('position') || filename.includes('role')) {
    return 'Job description file'
  }
  return 'Document'
}
