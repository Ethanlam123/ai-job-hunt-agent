/**
 * LLM Service
 *
 * Provides unified interface for Language Model operations using:
 * - OpenRouter API (for GPT-4/GPT-5 via compatible endpoint)
 * - OpenAI API (for embeddings: text-embedding-3-small)
 * - LangSmith tracing for monitoring and debugging
 */

import { ChatOpenAI } from '@langchain/openai'
import { OpenAIEmbeddings } from '@langchain/openai'
import { initializeLangSmith, getLangSmithStatus, LangSmithUtils } from '@/lib/config/langsmith'
import { APP_CONSTANTS } from '@/lib/config/app-config'

// Initialize LangSmith tracing when service is imported
if (typeof window === 'undefined') {
  initializeLangSmith()
}

/**
 * Create LLM instance using OpenRouter
 * OpenRouter provides OpenAI-compatible API with access to multiple models
 */
export function createLLM(options?: {
  model?: string
  temperature?: number
  maxTokens?: number
}) {
  const {
    model = APP_CONSTANTS.LLM_MODELS.DEFAULT,
    temperature = 0.7,
    maxTokens = 2000,
  } = options || {}

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const llm = new ChatOpenAI({
    model,
    temperature,
    maxTokens,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Job Hunt Agent',
      },
    },
  })

  // Log LangSmith status when creating LLM
  const status = getLangSmithStatus()
  if (status.enabled) {
    console.log(`🔍 LLM created with LangSmith tracing enabled (project: ${status.project})`)
  }

  return llm
}

/**
 * LLM invocation with enhanced tracing
 */
export async function invokeLLM(
  llm: any,
  prompt: string | any[],
  options?: {
    runName?: string
    metadata?: Record<string, any>
  }
) {
  const { runName = 'LLM Invocation', metadata = {} } = options || {}

  // Add LangSmith tracing if enabled
  return await LangSmithUtils.createRun(
    runName,
    { prompt: typeof prompt === 'string' ? prompt.slice(0, 200) + '...' : 'Array of messages', metadata },
    async () => {
      const startTime = Date.now()

      try {
        const result = await llm.invoke(prompt)
        const duration = Date.now() - startTime

        console.log(`✅ LLM call completed in ${duration}ms`)
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        console.error(`❌ LLM call failed after ${duration}ms:`, error)
        throw error
      }
    }
  )
}

/**
 * Create embeddings instance using OpenAI
 * Uses text-embedding-3-small (1536 dimensions)
 */
export function createEmbeddings() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: APP_CONSTANTS.LLM_MODELS.EMBEDDINGS,
    dimensions: APP_CONSTANTS.LLM_MODELS.EMBEDDING_DIMENSIONS,
  })
}

/**
 * Generate embedding vector for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = createEmbeddings()
  const vector = await embeddings.embedQuery(text)
  return vector
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = createEmbeddings()
  const vectors = await embeddings.embedDocuments(texts)
  return vectors
}

/**
 * Estimate token count (rough approximation)
 * More accurate counting would require tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text)

  if (estimatedTokens <= maxTokens) {
    return text
  }

  // Calculate approximate character limit
  const charLimit = maxTokens * 4
  return text.substring(0, charLimit) + '...'
}
