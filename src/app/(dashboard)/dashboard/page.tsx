import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createStatsService } from '@/lib/services/stats-service'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user stats
  const statsService = createStatsService()
  const stats = user ? await statsService.getUserStats(user.id) : null

  // Debug: Log user ID and stats for troubleshooting
  if (user) {
    console.log('[Dashboard] User ID:', user.id)
    console.log('[Dashboard] Stats:', stats)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Your AI-powered job hunting assistant
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>CV Analysis</CardTitle>
            <CardDescription>
              Upload and analyze your CV to get improvement suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild className="w-full">
              <Link href="/cv-analysis">Start CV Analysis</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Cover Letter</CardTitle>
            <CardDescription>
              Generate personalized cover letters for job applications
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild className="w-full">
              <Link href="/cover-letter">Create Cover Letter</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Interview Prep</CardTitle>
            <CardDescription>
              Practice with AI-generated mock interview questions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild className="w-full">
              <Link href="/interview">Start Interview Prep</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Skill Gap Analysis</CardTitle>
            <CardDescription>
              Identify missing skills and get a learning roadmap
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href="/workflow?type=skill-gap">Analyze Skills</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>
              View your past sessions and download results
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href="/history">View History</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your account and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end">
            <Button asChild className="w-full" variant="outline">
              <Link href="/profile">Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Your activity overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">CVs Uploaded</p>
              <p className="text-2xl font-bold">{stats?.cvsAnalyzed || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Cover Letters</p>
              <p className="text-2xl font-bold">{stats?.coverLetters || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Interview Sessions</p>
              <p className="text-2xl font-bold">{stats?.mockInterviews || 0}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-2xl font-bold">
                {(stats?.cvsAnalyzed || 0) + (stats?.coverLetters || 0) + (stats?.mockInterviews || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
