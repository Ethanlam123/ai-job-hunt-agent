import { ChatOpenAI } from '@langchain/openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { CVPrompts } from '@/lib/prompts/cv-prompts'
import { DocumentService } from '@/lib/services/document-service'

interface CVState {
  userId: string
  sessionId: string
  documentId: string
  cvContent: any
  analysis: any
  improvements: any[]
  approvalStatus: 'pending' | 'approved' | 'rejected'
  error?: string
}

export class CVAgent {
  private supabase: SupabaseClient
  private llm: ChatOpenAI
  private documentService: DocumentService

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase

    // Initialize OpenRouter LLM
    this.llm = new ChatOpenAI({
      model: 'openai/gpt-5-nano', // Using GPT-4o-mini via OpenRouter
      temperature: 0.7,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      },
    })

    this.documentService = new DocumentService(supabase)
  }

  /**
   * Main CV analysis workflow - sequential execution
   */
  async analyzeCV(documentId: string, sessionId: string, userId: string): Promise<CVState> {
    const state: CVState = {
      userId,
      sessionId,
      documentId,
      cvContent: null,
      analysis: null,
      improvements: [],
      approvalStatus: 'pending',
    }

    try {
      // Step 1: Parse CV content
      console.log('Step 1: Parsing CV...')
      const parsedState = await this.parseCVNode(state)
      Object.assign(state, parsedState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 2: Analyze structure
      console.log('Step 2: Analyzing structure...')
      const analyzedState = await this.analyzeStructureNode(state)
      Object.assign(state, analyzedState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 3: Identify improvements
      console.log('Step 3: Identifying improvements...')
      const improvementsState = await this.identifyImprovementsNode(state)
      Object.assign(state, improvementsState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 4: Save results
      console.log('Step 4: Saving results...')
      const finalState = await this.saveResultsNode(state)
      Object.assign(state, finalState)

      console.log('CV Analysis completed successfully')
      return state
    } catch (error) {
      console.error('CV Analysis workflow error:', error)
      state.error = error instanceof Error ? error.message : 'Unknown error'
      await this.saveResultsNode(state)
      return state
    }
  }

  /**
   * Node 1: Parse CV content from database
   */
  private async parseCVNode(state: CVState): Promise<Partial<CVState>> {
    try {
      const document = await this.documentService.getDocument(
        state.documentId,
        state.userId
      )

      if (!document) {
        return { error: 'Document not found' }
      }

      // Use parsed_content from database (already parsed during upload)
      const cvContent = document.parsed_content || {
        fullText: 'No parsed content available',
        pageCount: 0,
      }

      return {
        cvContent,
      }
    } catch (error: any) {
      console.error('Parse CV node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 2: Analyze CV structure using LLM
   */
  private async analyzeStructureNode(state: CVState): Promise<Partial<CVState>> {
    try {
      if (state.error) {
        return {} // Skip if there's an error
      }

      const prompt = CVPrompts.analyzeStructure(state.cvContent)
      console.log('Analyze Structure - Sending prompt to LLM...')
      const response = await this.llm.invoke(prompt)
      console.log('Analyze Structure - LLM raw response:', response)

      // Parse LLM response
      let analysis
      try {
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

        console.log('Analyze Structure - Response content:', content)

        // Remove markdown code blocks if present
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        console.log('Analyze Structure - Cleaned content:', cleanContent)

        analysis = JSON.parse(cleanContent)
        console.log('Analyze Structure - Parsed successfully:', analysis)
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError)
        console.error('Raw content that failed to parse:', typeof response.content === 'string' ? response.content : JSON.stringify(response.content))
        // Fallback analysis
        analysis = {
          overallScore: 70,
          sections: {},
          strengths: ['Document uploaded successfully'],
          weaknesses: ['Detailed analysis unavailable'],
          recommendations: ['Review CV structure manually'],
        }
        console.log('Using fallback analysis data')
      }

      return {
        analysis,
      }
    } catch (error: any) {
      console.error('Analyze structure node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 3: Identify specific improvements using LLM
   */
  private async identifyImprovementsNode(state: CVState): Promise<Partial<CVState>> {
    try {
      if (state.error) {
        return {} // Skip if there's an error
      }

      const prompt = CVPrompts.identifyImprovements(state.cvContent, state.analysis)
      console.log('Identify Improvements - Sending prompt to LLM...')
      const response = await this.llm.invoke(prompt)
      console.log('Identify Improvements - LLM raw response:', response)

      // Parse LLM response
      let improvementsData
      try {
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

        console.log('Identify Improvements - Response content:', content)

        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        console.log('Identify Improvements - Cleaned content:', cleanContent)

        improvementsData = JSON.parse(cleanContent)
        console.log('Identify Improvements - Parsed successfully:', improvementsData)
      } catch (parseError) {
        console.error('Failed to parse improvements:', parseError)
        console.error('Raw content that failed to parse:', typeof response.content === 'string' ? response.content : JSON.stringify(response.content))
        improvementsData = {
          improvements: [
            {
              id: 'fallback-1',
              type: 'edit',
              section: 'general',
              priority: 'medium',
              title: 'Review and enhance',
              description: 'Manual review recommended',
              reasoning: 'Automatic analysis incomplete',
            },
          ],
        }
        console.log('Using fallback improvements data')
      }

      return {
        improvements: improvementsData.improvements || [],
      }
    } catch (error: any) {
      console.error('Identify improvements node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 4: Save analysis results to database
   */
  private async saveResultsNode(state: CVState): Promise<Partial<CVState>> {
    try {
      if (state.error) {
        // Save error state to tasks table
        await this.supabase.from('tasks').insert({
          session_id: state.sessionId,
          user_id: state.userId,
          task_type: 'cv_analysis',
          status: 'failed',
          error_message: state.error,
          metadata: {
            documentId: state.documentId,
          },
        })
        return {}
      }

      // Save successful analysis to tasks table
      const { error: taskError } = await this.supabase.from('tasks').insert({
        session_id: state.sessionId,
        user_id: state.userId,
        task_type: 'cv_analysis',
        status: 'completed',
        result: {
          analysis: state.analysis,
          improvements: state.improvements,
          documentId: state.documentId,
        },
        metadata: {
          documentId: state.documentId,
          timestamp: new Date().toISOString(),
        },
      })

      if (taskError) {
        console.error('Failed to save task:', taskError)
      }

      // Create approval records for each improvement
      if (state.improvements && state.improvements.length > 0) {
        const approvalRecords = state.improvements.map((improvement) => ({
          session_id: state.sessionId,
          user_id: state.userId,
          document_id: state.documentId,
          change_type: improvement.type || 'edit',
          original_content: { text: improvement.originalContent || null },
          proposed_content: improvement,
          status: 'pending',
        }))

        const { error: approvalError } = await this.supabase
          .from('approvals')
          .insert(approvalRecords)

        if (approvalError) {
          console.error('Failed to create approval records:', approvalError)
        }
      }

      return {
        approvalStatus: 'pending',
      }
    } catch (error: any) {
      console.error('Save results node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Get analysis results for a session
   */
  async getAnalysisResults(sessionId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('task_type', 'cv_analysis')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      throw new Error(`Failed to fetch analysis results: ${error.message}`)
    }

    return data
  }

  /**
   * Get pending approvals for a session
   */
  async getPendingApprovals(sessionId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('approvals')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true})

    if (error) {
      throw new Error(`Failed to fetch approvals: ${error.message}`)
    }

    return data
  }

  /**
   * Handle approval decision
   */
  async handleApproval(
    approvalId: string,
    decision: 'approved' | 'rejected',
    feedback: string | null,
    userId: string
  ) {
    const { data, error } = await this.supabase
      .from('approvals')
      .update({
        status: decision,
        user_feedback: feedback,
        decided_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update approval: ${error.message}`)
    }

    return data
  }
}
