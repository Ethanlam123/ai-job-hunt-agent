'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm-password') as string

  // Validate input
  if (!email || !password || !confirmPassword) {
    return { error: 'All fields are required' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  try {
    const data = {
      email,
      password,
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      ...data,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`
      }
    })

    if (error) {
      console.error('Sign-up error:', error)
      return { error: error.message }
    }

    console.log('Sign-up success:', signUpData)

    // Check if user needs email confirmation
    if (signUpData.user && !signUpData.user.email_confirmed_at) {
      revalidatePath('/', 'layout')
      return { success: 'Account created successfully! Please check your email to verify your account.' }
    } else if (signUpData.user && signUpData.user.email_confirmed_at) {
      // User is automatically confirmed, redirect to dashboard
      revalidatePath('/', 'layout')
      return { success: 'Account created successfully! Redirecting to dashboard...', redirect: '/dashboard' }
    } else {
      revalidatePath('/', 'layout')
      return { success: 'Account created successfully! Please check your email to verify your account.' }
    }

  } catch (err) {
    console.error('Unexpected sign-up error:', err)
    return { error: 'An unexpected error occurred during sign-up' }
  }
}

export async function signout() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}
