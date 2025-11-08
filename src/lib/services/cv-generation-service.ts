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
   * Generate updated CV by applying approved improvements and incorporating user responses
   */
  async generateUpdatedCV(
    originalCV: string,
    approvedImprovements: ApprovedImprovement[],
    userResponses?: any[]
  ): Promise<CVGenerationResult> {
    try {
      console.log('Generating updated CV...')
      console.log(`Original CV length: ${originalCV.length} characters`)
      console.log(`Number of approved improvements: ${approvedImprovements.length}`)
      console.log(`Number of user responses: ${userResponses?.length || 0}`)

      // Build improvement summary for LLM
      const improvementsSummary = this.buildImprovementsSummary(approvedImprovements)

      // Build user preferences summary for LLM
      const userPreferencesSummary = this.buildUserPreferencesSummary(userResponses || [])

      // Create prompt for LLM
      const prompt = this.createGenerationPrompt(originalCV, improvementsSummary, userPreferencesSummary)

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
   * Build a summary of user preferences and information for the LLM
   */
  private buildUserPreferencesSummary(userResponses: any[]): string {
    if (!userResponses || userResponses.length === 0) {
      return "No additional user preferences provided."
    }

    const personalInfo = userResponses.filter(r => r.question_category === 'personal')
    const careerInfo = userResponses.filter(r => r.question_category === 'career')
    const experienceInfo = userResponses.filter(r => r.question_category === 'experience')
    const formattingInfo = userResponses.filter(r => r.question_category === 'formatting')

    let summary = "# USER PREFERENCES AND INFORMATION\n\n"

    if (personalInfo.length > 0) {
      summary += "## Personal Information:\n"
      personalInfo.forEach(response => {
        summary += `- ${response.question_text}: ${this.formatAnswer(response.answer)}\n`
      })
      summary += "\n"
    }

    if (careerInfo.length > 0) {
      summary += "## Career Objectives:\n"
      careerInfo.forEach(response => {
        summary += `- ${response.question_text}: ${this.formatAnswer(response.answer)}\n`
      })
      summary += "\n"
    }

    if (experienceInfo.length > 0) {
      summary += "## Experience & Skills:\n"
      experienceInfo.forEach(response => {
        summary += `- ${response.question_text}: ${this.formatAnswer(response.answer)}\n`
      })
      summary += "\n"
    }

    if (formattingInfo.length > 0) {
      summary += "## Formatting Preferences:\n"
      formattingInfo.forEach(response => {
        summary += `- ${response.question_text}: ${this.formatAnswer(response.answer)}\n`
      })
      summary += "\n"
    }

    return summary.trim()
  }

  /**
   * Format user answer for display in summary
   */
  private formatAnswer(answer: any): string {
    if (Array.isArray(answer)) {
      return answer.join(', ')
    }
    if (typeof answer === 'boolean') {
      return answer ? 'Yes' : 'No'
    }
    return String(answer || 'Not provided')
  }

  /**
   * Create the prompt for CV generation
   */
  private createGenerationPrompt(originalCV: string, improvementsSummary: string, userPreferencesSummary: string): string {
    return `You are an expert CV writer. Your task is to update a CV by carefully applying approved improvements and incorporating user preferences to create a personalized, professional CV.

# ORIGINAL CV:
${originalCV}

# APPROVED IMPROVEMENTS TO APPLY:
${improvementsSummary}

# USER PREFERENCES AND INFORMATION:
${userPreferencesSummary}

# INSTRUCTIONS:
1. Read the original CV carefully
2. Apply each approved improvement to the appropriate section
3. Incorporate the user's personal information, career objectives, and preferences
4. Use the user's professional title, contact information, and career goals
5. Tailor the content based on the user's target role level and industries
6. Apply formatting preferences (length, section order, etc.) as specified
7. Maintain the overall structure and formatting of the CV
8. Keep all existing good content that wasn't mentioned in improvements
9. For "ADD" changes: Insert new content in the appropriate location
10. For "EDIT" changes: Modify existing content as described
11. For "DELETE" changes: Remove the specified content
12. Ensure the updated CV flows naturally and professionally
13. Use clear section headings (e.g., # Professional Summary, ## Work Experience, ## Education, ## Skills)
14. Personalize the content to reflect the user's specific career goals and preferences
15. Return ONLY the updated CV content in markdown format
16. Do NOT include any explanations, notes, or commentary - just the CV

# SPECIAL CONSIDERATIONS:
- Personalize the professional summary based on user's career objectives
- Highlight experience and skills that align with target industries
- Format according to user's preferred CV length and structure
- Emphasize achievements that match the user's career goals
- Include user's preferred contact information and professional title

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
