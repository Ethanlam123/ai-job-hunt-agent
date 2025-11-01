import { getUserDocuments } from '@/actions/documents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentsClient } from '@/components/documents/documents-client'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default async function DocumentsPage() {
  const result = await getUserDocuments()

  if (result.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
          <p className="text-muted-foreground mt-2">Manage your uploaded CVs and documents</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
        <p className="text-muted-foreground mt-2">
          Manage your uploaded CVs and documents. Upload once, use everywhere.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>
            Upload and manage your CVs, cover letters, and job descriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsClient initialDocuments={result.documents || []} />
        </CardContent>
      </Card>
    </div>
  )
}
