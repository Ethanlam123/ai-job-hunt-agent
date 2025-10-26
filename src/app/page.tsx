import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Job Hunt Agent</h1>
          <div className="flex gap-4">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Your AI-Powered
            <br />
            Career Assistant
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Get personalized CV improvements, practice interviews, generate cover letters,
            and identify skill gaps with our multi-agent AI system.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/register">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Everything you need to land your dream job
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  📄
                </div>
                <h3 className="text-xl font-semibold">CV Analysis</h3>
                <p className="text-muted-foreground">
                  Get AI-powered suggestions to improve your resume and stand out
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  ✉️
                </div>
                <h3 className="text-xl font-semibold">Cover Letters</h3>
                <p className="text-muted-foreground">
                  Generate personalized cover letters tailored to each job
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  🎤
                </div>
                <h3 className="text-xl font-semibold">Interview Prep</h3>
                <p className="text-muted-foreground">
                  Practice with AI-generated questions and get real-time feedback
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  📚
                </div>
                <h3 className="text-xl font-semibold">Skill Analysis</h3>
                <p className="text-muted-foreground">
                  Identify skill gaps and get a personalized learning roadmap
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Job Hunt Agent. Privacy-first AI career assistant.</p>
        </div>
      </footer>
    </div>
  )
}
