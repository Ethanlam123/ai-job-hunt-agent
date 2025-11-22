import { LoginForm } from '@/components/auth/login-form'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AuthErrorBoundary>
        <LoginForm />
      </AuthErrorBoundary>
    </div>
  )
}
