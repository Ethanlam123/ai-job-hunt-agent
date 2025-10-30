import { ChatOpenAI } from '@langchain/openai'
import { SupabaseClient } from '@supabase/supabase-js'

interface ApprovedImprovement {
  id: string
  changeType: string
  content: {
    section: string
    title: string
    description: string
    originalContent?: string
    proposedContent?: string
  }
}

interface CVGenerationResult {
  success: boolean
  updatedCV: string
  error?: string
}

export class CVGenerationService {
  private llm: ChatOpenAI
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase

    // Initialize OpenRouter LLM
    this.llm = new ChatOpenAI({
      model: 'openai/gpt-5-nano',
      temperature: 0.3, // Lower temperature for more consistent output
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      },
    })
  }

  /**
   * Generate updated CV by applying approved improvements
   */
  async generateUpdatedCV(
    originalCV: string,
    approvedImprovements: ApprovedImprovement[]
  ): Promise<CVGenerationResult> {
    try {
      console.log('Generating updated CV...')
      console.log(`Original CV length: ${originalCV.length} characters`)
      console.log(`Number of approved improvements: ${approvedImprovements.length}`)

      // Build improvement summary for LLM
      const improvementsSummary = this.buildImprovementsSummary(approvedImprovements)

      // Create prompt for LLM
      const prompt = this.createGenerationPrompt(originalCV, improvementsSummary)

      // Call LLM to generate updated CV
      const response = await this.llm.invoke(prompt)

      const updatedCV = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)

      console.log('CV generation successful')
      console.log(`Updated CV length: ${updatedCV.length} characters`)

      return {
        success: true,
        updatedCV: updatedCV.trim(),
      }
    } catch (error) {
      console.error('CV generation error:', error)
      return {
        success: false,
        updatedCV: '',
        error: error instanceof Error ? error.message : 'Failed to generate updated CV',
      }
    }
  }

  /**
   * Build a summary of improvements for the LLM
   */
  private buildImprovementsSummary(improvements: ApprovedImprovement[]): string {
    const summary = improvements.map((imp, index) => {
      const content = imp.content
      return `
${index + 1}. [${imp.changeType.toUpperCase()}] ${content.section || 'General'}
   Title: ${content.title}
   Description: ${content.description}
   ${content.proposedContent ? `Proposed Content: ${content.proposedContent}` : ''}
      `.trim()
    })

    return summary.join('\n\n')
  }

  /**
   * Create the prompt for CV generation
   */
  private createGenerationPrompt(originalCV: string, improvementsSummary: string): string {
    return `You are an expert CV writer. Your task is to update a CV by carefully applying a set of approved improvements.

# ORIGINAL CV:
${originalCV}

# APPROVED IMPROVEMENTS TO APPLY:
${improvementsSummary}

# INSTRUCTIONS:
1. Read the original CV carefully
2. Apply each approved improvement to the appropriate section
3. Maintain the overall structure and formatting of the CV
4. Keep all existing good content that wasn't mentioned in improvements
5. For "ADD" changes: Insert new content in the appropriate location
6. For "EDIT" changes: Modify existing content as described
7. For "DELETE" changes: Remove the specified content
8. Ensure the updated CV flows naturally and professionally
9. Use clear section headings (e.g., # Professional Summary, ## Work Experience, ## Education, ## Skills)
10. Return ONLY the updated CV content in markdown format
11. Do NOT include any explanations, notes, or commentary - just the CV

# OUTPUT FORMAT:
Return the complete updated CV in clean markdown format with proper headings and structure.

---

UPDATED CV:`
  }

  /**
   * Save generated CV to Supabase Storage
   */
  async saveGeneratedCV(
    userId: string,
    sessionId: string,
    originalDocumentId: string,
    updatedCVContent: string
  ): Promise<{ success: boolean; documentId?: string; filePath?: string; error?: string }> {
    try {
      const fileName = `${userId}/${Date.now()}-updated-cv.md`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(fileName, updatedCVContent, {
          contentType: 'text/markdown',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Create document record
      const { data: document, error: dbError } = await this.supabase
        .from('documents')
        .insert({
          user_id: userId,
          session_id: sessionId,
          document_type: 'cv',
          original_filename: 'updated-cv.md',
          file_path: uploadData.path,
          file_format: 'md',
          parsed_content: {
            fullText: updatedCVContent,
            generatedAt: new Date().toISOString(),
            basedOnDocument: originalDocumentId,
          },
          metadata: {
            size: Buffer.from(updatedCVContent).length,
            mimeType: 'text/markdown',
            type: 'generated',
            generatedAt: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (dbError) {
        throw new Error(`Failed to create document record: ${dbError.message}`)
      }

      return {
        success: true,
        documentId: document.id,
        filePath: uploadData.path,
      }
    } catch (error) {
      console.error('Save generated CV error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save generated CV',
      }
    }
  }
}
