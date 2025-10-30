/**
 * LLM Service
 *
 * Provides unified interface for Language Model operations using:
 * - OpenRouter API (for GPT-4/GPT-5 via compatible endpoint)
 * - OpenAI API (for embeddings: text-embedding-3-small)
 */

import { ChatOpenAI } from '@langchain/openai'
import { OpenAIEmbeddings } from '@langchain/openai'

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
    model = 'openai/gpt-4o', // Default model - can be changed to gpt-4o-mini or others
    temperature = 0.7,
    maxTokens = 2000,
  } = options || {}

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  return new ChatOpenAI({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    modelName: model,
    temperature,
    maxTokens,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'AI Job Hunt Agent',
      },
    },
  })
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
    modelName: 'text-embedding-3-small',
    dimensions: 1536, // Match database schema
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
