/**
 * Document Parsing Service
 *
 * Extracts text content from PDF and DOCX files using LangChain document loaders.
 * This service is used to parse uploaded CVs and job descriptions for AI analysis.
 */

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx'
import { Document } from '@langchain/core/documents'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export interface ParsedDocument {
  text: string
  documents: Document[] // LangChain documents for advanced processing
  metadata?: {
    pages?: number
    author?: string
    title?: string
    wordCount?: number
  }
}

export class DocumentParser {
  /**
   * Parse a document buffer based on file extension using LangChain loaders
   */
  async parseDocument(buffer: Buffer, fileExtension: string): Promise<ParsedDocument> {
    const ext = fileExtension.toLowerCase().replace('.', '')

    switch (ext) {
      case 'pdf':
        return this.parsePDF(buffer)
      case 'docx':
        return this.parseDOCX(buffer)
      case 'txt':
        return this.parseTXT(buffer)
      default:
        throw new Error(`Unsupported file format: ${ext}`)
    }
  }

  /**
   * Create temporary file from buffer (LangChain loaders need file paths)
   */
  private async createTempFile(buffer: Buffer, extension: string): Promise<string> {
    const tempPath = join(tmpdir(), `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`)
    await writeFile(tempPath, buffer)
    return tempPath
  }

  /**
   * Parse PDF file using LangChain PDFLoader
   */
  private async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    let tempPath: string | null = null
    try {
      tempPath = await this.createTempFile(buffer, 'pdf')
      const loader = new PDFLoader(tempPath)
      const documents = await loader.load()

      const text = documents.map(doc => doc.pageContent).join('\n\n')

      return {
        text,
        documents,
        metadata: {
          pages: documents.length,
          wordCount: this.countWords(text),
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`PDF parsing failed: ${message}`)
    } finally {
      if (tempPath) {
        try {
          await unlink(tempPath)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Parse DOCX file using LangChain DocxLoader
   */
  private async parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
    let tempPath: string | null = null
    try {
      tempPath = await this.createTempFile(buffer, 'docx')
      const loader = new DocxLoader(tempPath)
      const documents = await loader.load()

      const text = documents.map(doc => doc.pageContent).join('\n\n')

      return {
        text,
        documents,
        metadata: {
          wordCount: this.countWords(text),
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`DOCX parsing failed: ${message}`)
    } finally {
      if (tempPath) {
        try {
          await unlink(tempPath)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Parse TXT file (plain text - no loader needed)
   */
  private async parseTXT(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const text = buffer.toString('utf-8')

      // Create a Document object for consistency with other loaders
      const document = new Document({
        pageContent: text,
        metadata: {
          source: 'text-file',
        },
      })

      return {
        text,
        documents: [document],
        metadata: {
          wordCount: this.countWords(text),
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`TXT parsing failed: ${message}`)
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length
  }

  /**
   * Extract sections from CV text (simple heuristic-based approach)
   * This is a basic implementation - could be enhanced with ML-based section detection
   */
  extractCVSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {}

    // Common CV section headers (case-insensitive)
    const sectionPatterns = [
      { key: 'summary', patterns: ['summary', 'profile', 'objective', 'about me'] },
      { key: 'experience', patterns: ['experience', 'work history', 'employment', 'professional experience'] },
      { key: 'education', patterns: ['education', 'academic', 'qualifications'] },
      { key: 'skills', patterns: ['skills', 'technical skills', 'competencies', 'expertise'] },
      { key: 'projects', patterns: ['projects', 'portfolio'] },
      { key: 'certifications', patterns: ['certifications', 'certificates', 'licenses'] },
      { key: 'awards', patterns: ['awards', 'honors', 'achievements'] },
    ]

    // Split text into lines
    const lines = text.split('\n')
    let currentSection = 'other'
    let currentContent: string[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Check if line is a section header
      let foundSection = false
      for (const { key, patterns } of sectionPatterns) {
        if (patterns.some(pattern => trimmedLine.toLowerCase().includes(pattern))) {
          // Save previous section
          if (currentContent.length > 0) {
            sections[currentSection] = currentContent.join('\n').trim()
          }

          // Start new section
          currentSection = key
          currentContent = []
          foundSection = true
          break
        }
      }

      if (!foundSection) {
        currentContent.push(trimmedLine)
      }
    }

    // Save last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim()
    }

    return sections
  }
}
