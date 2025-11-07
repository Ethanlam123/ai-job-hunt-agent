/**
 * LangSmith Tracing Configuration
 *
 * Initializes LangSmith tracing for LangChain operations.
 * Tracing helps debug and monitor agent workflows, LLM calls,
 * and chain executions in development and production.
 */

import { Client } from 'langsmith'

// Environment variables for LangSmith
const LANGCHAIN_TRACING_V2 = process.env.LANGCHAIN_TRACING_V2 === 'true'
const LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || 'job-hunt-agent'
const LANGCHAIN_API_KEY = process.env.LANGCHAIN_API_KEY

/**
 * Initialize LangSmith tracing if enabled
 */
export function initializeLangSmith() {
  // Only initialize if tracing is enabled and API key is provided
  if (LANGCHAIN_TRACING_V2 && LANGCHAIN_API_KEY) {
    try {
      console.log('🔍 Initializing LangSmith tracing...')

      // Set environment variables for LangChain auto-instrumentation
      process.env.LANGCHAIN_TRACING_V2 = 'true'
      process.env.LANGCHAIN_PROJECT = LANGCHAIN_PROJECT
      process.env.LANGCHAIN_API_KEY = LANGCHAIN_API_KEY

      console.log(`✅ LangSmith tracing enabled for project: ${LANGCHAIN_PROJECT}`)

      // Optional: Test connection to LangSmith
      if (process.env.NODE_ENV === 'development') {
        verifyLangSmithConnection()
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize LangSmith tracing:', error)
    }
  } else {
    console.log('ℹ️ LangSmith tracing disabled (missing LANGCHAIN_TRACING_V2=true or LANGCHAIN_API_KEY)')
  }
}

/**
 * Verify LangSmith connection (development only)
 */
async function verifyLangSmithConnection() {
  try {
    const client = new Client({
      apiUrl: 'https://api.smith.langchain.com',
      apiKey: LANGCHAIN_API_KEY,
    })

    // Simple connection test - list recent runs (should be empty or return few results)
    const runs = await client.listRuns({
      projectName: LANGCHAIN_PROJECT,
      limit: 1,
    })

    console.log(`✅ LangSmith connection verified. Project: ${LANGCHAIN_PROJECT}`)
  } catch (error) {
    console.warn('⚠️ LangSmith connection verification failed:', error)
  }
}

/**
 * Get LangSmith configuration status
 */
export function getLangSmithStatus() {
  return {
    enabled: LANGCHAIN_TRACING_V2 && !!LANGCHAIN_API_KEY,
    project: LANGCHAIN_PROJECT,
    tracing: LANGCHAIN_TRACING_V2,
    hasApiKey: !!LANGCHAIN_API_KEY,
  }
}

/**
 * LangSmith utilities for manual tracing
 */
export const LangSmithUtils = {
  /**
   * Create a custom run for manual tracing
   */
  async createRun(name: string, inputs: any, execute: () => Promise<any>) {
    if (!LANGCHAIN_TRACING_V2 || !LANGCHAIN_API_KEY) {
      return execute()
    }

    try {
      const client = new Client({
        apiUrl: 'https://api.smith.langchain.com',
        apiKey: LANGCHAIN_API_KEY,
      })

      // Create a run manually
      const run = await client.createRun({
        name,
        inputs,
        projectName: LANGCHAIN_PROJECT,
        startTime: new Date(),
      })

      try {
        const result = await execute()

        // End the run successfully
        await client.updateRun(run.id, {
          outputs: { result },
          endTime: new Date(),
          status: 'success',
        })

        return result
      } catch (error) {
        // End the run with error
        await client.updateRun(run.id, {
          endTime: new Date(),
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        })

        throw error
      }
    } catch (error) {
      console.warn('Failed to create LangSmith run:', error)
      return execute()
    }
  },
}

// Auto-initialize when module is imported
if (typeof window === 'undefined') {
  // Only initialize on server-side
  initializeLangSmith()
}