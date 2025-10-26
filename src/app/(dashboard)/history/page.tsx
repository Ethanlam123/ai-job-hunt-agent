import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your past sessions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No Sessions Yet</CardTitle>
          <CardDescription>
            Your completed sessions will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start a workflow from the dashboard to create your first session.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
