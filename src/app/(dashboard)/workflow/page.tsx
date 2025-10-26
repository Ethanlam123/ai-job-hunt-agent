import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function WorkflowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow</h1>
        <p className="text-muted-foreground mt-2">
          Start a new job hunting workflow
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The workflow feature is currently under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will allow you to start guided workflows for CV analysis,
            cover letter generation, interview preparation, and skill gap analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
