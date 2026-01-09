import type { NextConfig } from 'next'

// PRODUCTION SECURITY CHECK: Build-time validation
if (process.env.NODE_ENV === 'production' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SECURITY: SUPABASE_SERVICE_ROLE_KEY is not allowed in production. ' +
    'This key bypasses Row Level Security (RLS) policies. ' +
    'Please remove SUPABASE_SERVICE_ROLE_KEY from your production environment.'
  )
}

const nextConfig: NextConfig = {
  // Configure output to avoid build cache issues
  outputFileTracingRoot: __dirname,
}

export default nextConfig
