import type { NextConfig } from 'next'

// PRODUCTION SECURITY CHECK: Build-time validation
// Both legacy service_role and new secret keys bypass RLS and must be blocked in production
const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
const hasSecretKey = !!process.env.SUPABASE_SECRET_KEY

if (process.env.NODE_ENV === 'production' && (hasServiceRoleKey || hasSecretKey)) {
  const keys = []
  if (hasServiceRoleKey) keys.push('SUPABASE_SERVICE_ROLE_KEY (legacy)')
  if (hasSecretKey) keys.push('SUPABASE_SECRET_KEY (new)')

  throw new Error(
    `SECURITY: Build failed - elevated access keys found: ${keys.join(', ')}. ` +
    'These keys bypass Row Level Security (RLS) policies. ' +
    'Please remove them from your production environment.',
  )
}

const nextConfig: NextConfig = {
  // Configure output to avoid build cache issues
  outputFileTracingRoot: __dirname,
}

export default nextConfig
