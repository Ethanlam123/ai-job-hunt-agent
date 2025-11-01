import { ChatOpenAI } from '@langchain/openai'
import { SupabaseClient } from '@supabase/supabase-js'
import { InterviewPrompts } from '@/lib/prompts/interview-prompts'
import { DocumentService } from '@/lib/services/document-service'

interface InterviewState {
  userId: string
  sessionId: string
  cvDocumentId: string
  jdDocumentId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cvContent: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jdContent: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questions: any[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  error?: string
}

interface AnswerEvaluation {
  questionId: string
  answer: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation: any
}

export class InterviewAgent {
  private supabase: SupabaseClient
  private llm: ChatOpenAI
  private documentService: DocumentService

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase

    // Initialize OpenRouter LLM
    this.llm = new ChatOpenAI({
      model: 'openai/gpt-5-nano',
      temperature: 0.7,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      },
    })

    this.documentService = new DocumentService(supabase)
  }

  /**
   * Main interview preparation workflow - sequential execution
   */
  async generateInterviewQuestions(
    cvDocumentId: string,
    jdDocumentId: string,
    sessionId: string,
    userId: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    questionCount: number = 10
  ): Promise<InterviewState> {
    const state: InterviewState = {
      userId,
      sessionId,
      cvDocumentId,
      jdDocumentId,
      cvContent: null,
      jdContent: null,
      questions: [],
      difficulty,
    }

    try {
      // Step 1: Parse CV and JD content
      console.log('Step 1: Parsing CV and JD...')
      const parsedState = await this.parseDocumentsNode(state)
      Object.assign(state, parsedState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 2: Generate interview questions
      console.log('Step 2: Generating interview questions...')
      const questionsState = await this.generateQuestionsNode(state, questionCount)
      Object.assign(state, questionsState)

      if (state.error) {
        await this.saveResultsNode(state)
        return state
      }

      // Step 3: Save results
      console.log('Step 3: Saving results...')
      const finalState = await this.saveResultsNode(state)
      Object.assign(state, finalState)

      console.log('Interview preparation completed successfully')
      return state
    } catch (error) {
      console.error('Interview preparation workflow error:', error)
      state.error = error instanceof Error ? error.message : 'Unknown error'
      await this.saveResultsNode(state)
      return state
    }
  }

  /**
   * Node 1: Parse CV and JD content from database
   */
  private async parseDocumentsNode(state: InterviewState): Promise<Partial<InterviewState>> {
    try {
      // Fetch CV document
      const cvDocument = await this.documentService.getDocument(
        state.cvDocumentId,
        state.userId
      )

      if (!cvDocument) {
        return { error: 'CV document not found' }
      }

      // Fetch JD document
      const jdDocument = await this.documentService.getDocument(
        state.jdDocumentId,
        state.userId
      )

      if (!jdDocument) {
        return { error: 'Job description document not found' }
      }

      const cvContent = cvDocument.parsed_content || {
        fullText: 'No parsed content available',
        pageCount: 0,
      }

      const jdContent = jdDocument.parsed_content || {
        fullText: 'No parsed content available',
        pageCount: 0,
      }

      return {
        cvContent,
        jdContent,
      }
    } catch (error: any) {
      console.error('Parse documents node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 2: Generate interview questions using LLM
   */
  private async generateQuestionsNode(
    state: InterviewState,
    questionCount: number
  ): Promise<Partial<InterviewState>> {
    try {
      if (state.error) {
        return {} // Skip if there's an error
      }

      const prompt = InterviewPrompts.generateQuestions(
        state.cvContent,
        state.jdContent,
        state.difficulty,
        questionCount
      )

      console.log('Generate Questions - Sending prompt to LLM...')
      const response = await this.llm.invoke(prompt)
      console.log('Generate Questions - LLM raw response:', response)

      // Parse LLM response
      let questionsData
      try {
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

        console.log('Generate Questions - Response content:', content)

        // Remove markdown code blocks if present
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        console.log('Generate Questions - Cleaned content:', cleanContent)

        questionsData = JSON.parse(cleanContent)
        console.log('Generate Questions - Parsed successfully:', questionsData)
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError)
        console.error(
          'Raw content that failed to parse:',
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content)
        )

        // Fallback questions
        questionsData = {
          questions: [
            {
              id: 'fallback-1',
              type: 'behavioral',
              category: 'experience',
              difficulty: state.difficulty,
              question: 'Tell me about your most challenging project and how you handled it.',
              expectedAnswer: 'Should include situation, task, action, and result (STAR method)',
              evaluationCriteria: ['Clear problem description', 'Specific actions taken', 'Measurable results'],
              reasoning: 'Fallback question - automatic generation failed',
            },
          ],
          interviewStructure: {
            opening: 'Start with introductions and set expectations',
            focusAreas: ['Technical skills', 'Experience'],
            closingTopics: ['Questions for the interviewer'],
          },
        }
        console.log('Using fallback questions data')
      }

      return {
        questions: questionsData.questions || [],
      }
    } catch (error: any) {
      console.error('Generate questions node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Node 3: Save interview questions to database
   */
  private async saveResultsNode(state: InterviewState): Promise<Partial<InterviewState>> {
    try {
      if (state.error) {
        // Save error state to tasks table
        await this.supabase.from('tasks').insert({
          session_id: state.sessionId,
          user_id: state.userId,
          task_type: 'interview_preparation',
          status: 'failed',
          error_message: state.error,
          metadata: {
            cvDocumentId: state.cvDocumentId,
            jdDocumentId: state.jdDocumentId,
          },
        })
        return {}
      }

      // Save successful interview preparation to tasks table
      const { error: taskError } = await this.supabase.from('tasks').insert({
        session_id: state.sessionId,
        user_id: state.userId,
        task_type: 'interview_preparation',
        status: 'completed',
        result: {
          questions: state.questions,
          cvDocumentId: state.cvDocumentId,
          jdDocumentId: state.jdDocumentId,
          difficulty: state.difficulty,
        },
        metadata: {
          cvDocumentId: state.cvDocumentId,
          jdDocumentId: state.jdDocumentId,
          questionCount: state.questions.length,
          timestamp: new Date().toISOString(),
        },
      })

      if (taskError) {
        console.error('Failed to save task:', taskError)
      }

      // Save interview questions to interview_questions table
      if (state.questions && state.questions.length > 0) {
        const questionRecords = state.questions.map((question, index) => ({
          session_id: state.sessionId,
          user_id: state.userId,
          document_id: state.cvDocumentId,
          job_description_id: state.jdDocumentId,
          question_type: question.type || 'behavioral',
          difficulty: question.difficulty || state.difficulty,
          question_text: question.question,
          expected_answer: question.expectedAnswer,
          evaluation_criteria: question.evaluationCriteria || [],
          order_index: index,
          metadata: {
            category: question.category,
            reasoning: question.reasoning,
          },
        }))

        const { error: questionsError } = await this.supabase
          .from('interview_questions')
          .insert(questionRecords)

        if (questionsError) {
          console.error('Failed to save interview questions:', questionsError)
        }
      }

      return {}
    } catch (error: any) {
      console.error('Save results node error:', error)
      return { error: error.message }
    }
  }

  /**
   * Evaluate a candidate's answer to an interview question
   */
  async evaluateAnswer(
    questionId: string,
    candidateAnswer: string,
    userId: string
  ): Promise<any> {
    try {
      // Fetch the question from database
      const { data: question, error: questionError } = await this.supabase
        .from('interview_questions')
        .select('*')
        .eq('id', questionId)
        .eq('user_id', userId)
        .single()

      if (questionError || !question) {
        throw new Error('Question not found')
      }

      // Generate evaluation using LLM
      const prompt = InterviewPrompts.evaluateAnswer(
        question.question_text,
        question.expected_answer,
        candidateAnswer,
        question.evaluation_criteria || []
      )

      console.log('Evaluate Answer - Sending prompt to LLM...')
      const response = await this.llm.invoke(prompt)

      // Parse evaluation
      let evaluation
      try {
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        evaluation = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse evaluation:', parseError)
        evaluation = {
          score: 5,
          strengths: [{ point: 'Answer provided', explanation: 'User attempted to answer' }],
          weaknesses: [{ point: 'Evaluation unavailable', explanation: 'Automatic evaluation failed' }],
          missingPoints: [],
          overallFeedback: 'Manual review recommended',
          improvementSuggestions: [],
          followUpQuestions: [],
        }
      }

      // Update question with user's answer and evaluation
      await this.supabase
        .from('interview_questions')
        .update({
          user_answer: candidateAnswer,
          evaluation_result: evaluation,
          answered_at: new Date().toISOString(),
        })
        .eq('id', questionId)
        .eq('user_id', userId)

      return evaluation
    } catch (error: any) {
      console.error('Evaluate answer error:', error)
      throw error
    }
  }

  /**
   * Analyze overall interview performance for a session
   */
  async analyzePerformance(sessionId: string, userId: string): Promise<any> {
    try {
      // Fetch all questions and answers for the session
      const { data: questions, error: questionsError } = await this.supabase
        .from('interview_questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('order_index', { ascending: true })

      if (questionsError) {
        throw new Error('Failed to fetch questions')
      }

      if (!questions || questions.length === 0) {
        throw new Error('No questions found for this session')
      }

      // Filter answered questions
      const answeredQuestions = questions.filter(q => q.user_answer && q.evaluation_result)

      if (answeredQuestions.length === 0) {
        throw new Error('No answered questions found')
      }

      // Prepare data for analysis
      const questionsData = answeredQuestions.map(q => ({
        type: q.question_type,
        difficulty: q.difficulty,
        question: q.question_text,
      }))

      const answersData = answeredQuestions.map(q => ({
        answer: q.user_answer,
      }))

      const evaluationsData = answeredQuestions.map(q => q.evaluation_result)

      // Generate performance analysis using LLM
      const prompt = InterviewPrompts.analyzeInterviewPerformance(
        questionsData,
        answersData,
        evaluationsData
      )

      console.log('Analyze Performance - Sending prompt to LLM...')
      const response = await this.llm.invoke(prompt)

      // Parse analysis
      let performanceAnalysis
      try {
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)

        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        performanceAnalysis = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse performance analysis:', parseError)

        // Calculate basic stats as fallback
        const avgScore = evaluationsData.reduce((sum, e) => sum + (e.score || 0), 0) / evaluationsData.length

        performanceAnalysis = {
          overallScore: Math.round(avgScore * 10),
          categoryScores: {
            behavioral: avgScore * 10,
            technical: avgScore * 10,
            situational: avgScore * 10,
            competency: avgScore * 10,
          },
          strengthAreas: [],
          improvementAreas: [],
          communicationSkills: { score: 70, clarity: 'good', structure: 'good', conciseness: 'good', notes: [] },
          technicalCompetence: { score: 70, depth: 'good', breadth: 'good', notes: [] },
          hiringRecommendation: {
            decision: 'maybe',
            reasoning: 'Automatic analysis unavailable',
            concerns: [],
            positives: [],
          },
          preparationTips: [],
        }
      }

      // Save performance analysis to tasks
      await this.supabase.from('tasks').insert({
        session_id: sessionId,
        user_id: userId,
        task_type: 'interview_performance_analysis',
        status: 'completed',
        result: {
          performanceAnalysis,
          questionsAnswered: answeredQuestions.length,
          totalQuestions: questions.length,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      })

      return performanceAnalysis
    } catch (error: any) {
      console.error('Analyze performance error:', error)
      throw error
    }
  }

  /**
   * Get interview questions for a session
   */
  async getInterviewQuestions(sessionId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch interview questions: ${error.message}`)
    }

    return data
  }

  /**
   * Get a specific question by ID
   */
  async getQuestion(questionId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('interview_questions')
      .select('*')
      .eq('id', questionId)
      .eq('user_id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch question: ${error.message}`)
    }

    return data
  }
}
