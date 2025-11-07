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

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Get client IP for rate limiting
  const clientIp = await getClientIpServer()

  // Check rate limiting for login attempts
  const rateLimitResult = await checkAuthRateLimit('LOGIN', clientIp)
  if (!rateLimitResult.success) {
    return createErrorResponse(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'Too many login attempts. Please try again later.',
      [{
        message: `Rate limit exceeded. Try again after ${Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000)} seconds`,
        code: 'RATE_LIMIT_RETRY_AFTER'
      }]
    )
  }

  // Validate and sanitize input
  const validation = validateAuthFormData(formData)

  if (!validation.isValid) {
    return createErrorResponse(
      ERROR_CODES.INVALID_INPUT_FORMAT,
      'Validation failed',
      validation.errors.map(message => ({ message }))
    )
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    })

    if (error) {
      return handleError(error)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')

  } catch (error) {
    return handleError(error)
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Get client IP for rate limiting
  const clientIp = await getClientIpServer()

  // Check rate limiting for signup attempts
  const rateLimitResult = await checkAuthRateLimit('SIGNUP', clientIp)
  if (!rateLimitResult.success) {
    return createErrorResponse(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'Too many signup attempts. Please try again later.',
      [{
        message: `Rate limit exceeded. Try again after ${Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000)} seconds`,
        code: 'RATE_LIMIT_RETRY_AFTER'
      }]
    )
  }

  // Validate and sanitize input
  const validation = validateAuthFormData(formData)

  if (!validation.isValid) {
    return createErrorResponse(
      ERROR_CODES.INVALID_INPUT_FORMAT,
      'Validation failed',
      validation.errors.map(message => ({ message }))
    )
  }

  try {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`
      }
    })

    if (error) {
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
      revalidatePath('/', 'layout')
      return createSuccessResponse(
        { email: validation.data.email },
        'Account created successfully! Please check your email to verify your account.'
      )
    } else if (signUpData.user && signUpData.user.email_confirmed_at) {
      // User is automatically confirmed, redirect to dashboard
      revalidatePath('/', 'layout')
      return createSuccessResponse(
        { redirect: '/dashboard' },
        'Account created successfully! Redirecting to dashboard...'
      )
    } else {
      revalidatePath('/', 'layout')
      return createSuccessResponse(
        { email: validation.data.email },
        'Account created successfully! Please check your email to verify your account.'
      )
    }

  } catch (error) {
    return handleError(error)
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
