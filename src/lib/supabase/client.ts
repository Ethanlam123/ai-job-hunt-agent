/**
 * Client-side Supabase Client
 *
 * This module provides a Supabase client for use in React Client Components.
 * For Server Components and Server Actions, use @/lib/supabase/server instead.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
