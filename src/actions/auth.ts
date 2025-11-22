'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateAuthFormData } from '@/lib/utils/validation'
import { checkAuthRateLimit } from '@/lib/services/rate-limit-service'
import { getClientIpServer } from '@/lib/utils/server-utils'
import {
  createErrorResponse,
  createSuccessResponse,
  handleError,
  ERROR_CODES,
  type StandardResponse
} from '@/lib/utils/error-response'

export async function login(prevState: any, formData: FormData) {
  console.log('🔐 LOGIN: Starting login process')

  const supabase = await createClient()
  console.log('🔗 LOGIN: Supabase client created')

  // Get client IP for rate limiting
  const clientIp = await getClientIpServer()
  console.log('🌐 LOGIN: Client IP:', clientIp)

  // TODO: Temporarily disable rate limiting to fix authentication issue
  // Check rate limiting for login attempts
  // const rateLimitResult = await checkAuthRateLimit('LOGIN', clientIp)
  // if (!rateLimitResult.success) {
  //   return {
  //     success: false,
  //     error: 'Too many login attempts. Please try again later.'
  //   }
  // }

  // Validate and sanitize input
  const validation = validateAuthFormData(formData)
  console.log('📋 LOGIN: Validation result:', { isValid: validation.isValid, email: validation.data?.email })

  if (!validation.isValid) {
    console.log('❌ LOGIN: Validation failed:', validation.errors)
    return {
      success: false,
      error: 'Please check your input and try again.',
      fieldErrors: validation.errors.reduce((acc, error, index) => {
        // Map errors to field names based on validation patterns
        if (error.toLowerCase().includes('email')) {
          acc.email = error
        } else if (error.toLowerCase().includes('password')) {
          acc.password = error
        } else {
          // Default to email field for general validation errors
          acc.email = error
        }
        return acc
      }, {} as Record<string, string>)
    }
  }

  try {
    console.log('🔑 LOGIN: Attempting Supabase signIn for email:', validation.data.email)
    console.log('🔗 LOGIN: Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    })

    console.log('📊 LOGIN: Supabase response:', {
      hasData: !!data,
      hasError: !!error,
      error: error?.message,
      userId: data?.user?.id,
      emailConfirmed: data?.user?.email_confirmed_at,
      session: data?.session ? 'exists' : 'none'
    })

    if (error) {
      console.log('❌ LOGIN: Supabase error:', error)
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
        fieldErrors: {}
      }
    }

    console.log('✅ LOGIN: Login successful, redirecting to dashboard')
    revalidatePath('/', 'layout')
    redirect('/dashboard')

  } catch (error) {
    // Check if it's a Next.js redirect error (successful login)
    if (error instanceof Error && error.digest?.includes('NEXT_REDIRECT')) {
      // This is expected behavior for successful login redirect
      // Re-throw it so Next.js can handle the redirect
      throw error
    }

    console.error('💥 LOGIN: Unexpected error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      fieldErrors: {}
    }
  }
}

export async function signup(formData: FormData) {
  console.log('🚀 SIGNUP: Starting registration process')

  const supabase = await createClient()
  console.log('🔗 SIGNUP: Supabase client created')

  // Get client IP for rate limiting
  const clientIp = await getClientIpServer()
  console.log('🌐 SIGNUP: Client IP:', clientIp)

  // TODO: Temporarily disable rate limiting to fix registration issue
  // Check rate limiting for signup attempts
  // const rateLimitResult = await checkAuthRateLimit('SIGNUP', clientIp)
  // if (!rateLimitResult.success) {
  //   return createErrorResponse(
  //     ERROR_CODES.RATE_LIMIT_EXCEEDED,
  //     'Too many signup attempts. Please try again later.',
  //     [{
  //       message: `Rate limit exceeded. Try again after ${Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000)} seconds`,
  //       code: 'RATE_LIMIT_RETRY_AFTER'
  //     }]
  //   )
  // }

  console.log('📋 SIGNUP: Validating form data')
  // Validate and sanitize input
  const validation = validateAuthFormData(formData)
  console.log('✅ SIGNUP: Validation result:', { isValid: validation.isValid, email: validation.data?.email })

  if (!validation.isValid) {
    console.log('❌ SIGNUP: Validation failed:', validation.errors)
    return createErrorResponse(
      ERROR_CODES.INVALID_INPUT_FORMAT,
      'Validation failed',
      validation.errors.map(message => ({ message }))
    )
  }

  try {
    console.log('📧 SIGNUP: Attempting Supabase signUp for email:', validation.data.email)
    console.log('🔗 SIGNUP: Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`
      }
    })

    console.log('📊 SIGNUP: Supabase response:', {
      hasData: !!signUpData,
      hasError: !!error,
      error: error?.message,
      userId: signUpData?.user?.id,
      emailConfirmed: signUpData?.user?.email_confirmed_at
    })

    if (error) {
      console.log('❌ SIGNUP: Supabase error:', error)
      return handleError(error)
    }

    // Log success without sensitive user data in production
    if (process.env.NODE_ENV === 'production') {
      console.log('New user registration successful')
    } else {
      console.log('Sign-up success:', signUpData)
    }

    // Check if user needs email confirmation
    if (signUpData.user && !signUpData.user.email_confirmed_at) {
      console.log('✉️ SIGNUP: User created but email confirmation required')
      revalidatePath('/', 'layout')
      const response = createSuccessResponse(
        { email: validation.data.email },
        'Account created successfully! Please check your email to verify your account.'
      )
      console.log('📤 SIGNUP: Returning response (email confirmation):', response)
      return response
    } else if (signUpData.user && signUpData.user.email_confirmed_at) {
      console.log('🎯 SIGNUP: User automatically confirmed, redirecting to dashboard')
      // User is automatically confirmed, redirect to dashboard
      revalidatePath('/', 'layout')
      const response = createSuccessResponse(
        { redirect: '/dashboard' },
        'Account created successfully! Redirecting to dashboard...'
      )
      console.log('📤 SIGNUP: Returning response (auto-confirmed):', response)
      return response
    } else {
      console.log('⚠️ SIGNUP: No user data received, treating as email confirmation case')
      revalidatePath('/', 'layout')
      const response = createSuccessResponse(
        { email: validation.data.email },
        'Account created successfully! Please check your email to verify your account.'
      )
      console.log('📤 SIGNUP: Returning response (fallback):', response)
      return response
    }

  } catch (error) {
    console.log('💥 SIGNUP: Exception caught:', error)
    const response = handleError(error)
    console.log('📤 SIGNUP: Returning error response:', response)
    return response
  }
}

export async function signout() {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return handleError(error)
    }

    revalidatePath('/', 'layout')
    redirect('/login')

  } catch (error) {
    return handleError(error)
  }
}
