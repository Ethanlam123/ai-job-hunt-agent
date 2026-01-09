// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Polyfill fetch for Jest environment (Node.js 18+ has native fetch)
if (typeof fetch === 'undefined') {
  global.fetch = async (...args) => {
    const { default: fetch } = await import('node-fetch')
    return fetch(...args)
  }
}
