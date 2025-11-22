'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { login } from '@/actions/auth'
import { toast } from 'sonner'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(login, {
    success: false,
    error: 'null',
    fieldErrors: {}
  })

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
            {state?.fieldErrors?.email && (
              <p className="text-sm text-red-600">{state.fieldErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
            {state?.fieldErrors?.password && (
              <p className="text-sm text-red-600">{state.fieldErrors.password}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <SubmitButton />
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto"
              onClick={() => router.push('/register')}
            >
              Sign up
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
