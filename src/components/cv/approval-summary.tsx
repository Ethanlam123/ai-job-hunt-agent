'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { generateUpdatedCV, getDocumentContent } from '@/actions/cv'
import { CVComparison } from './cv-comparison'
import { createClient } from '@/lib/supabase/client'

interface ApprovalSummaryData {
  total: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  responseCount?: number; // Number of questionnaire responses
  approved: Array<{
    id: string;
    changeType: string;
    content: any;
    decidedAt: string;
  }>;
  rejected: Array<{
    id: string;
    changeType: string;
    content: any;
    feedback: string;
    decidedAt: string;
  }>;
  pending: Array<{
    id: string;
    changeType: string;
    content: any;
  }>;
}

interface ApprovalSummaryProps {
  summary: ApprovalSummaryData;
  sessionId: string;
  onBack: () => void;
  preGeneratedCV?: {
    documentId: string | null;
    downloadUrl: string | null;
  };
}

export function ApprovalSummary({ summary, sessionId, onBack, preGeneratedCV }: ApprovalSummaryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [originalCV, setOriginalCV] = useState<string>('')
  const [updatedCV, setUpdatedCV] = useState<string>('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate CV and fetch content when component mounts (if not already generated)
  useEffect(() => {
    const initializeComparison = async () => {
      // Check if we have either approved improvements or questionnaire responses
      if (summary.approvedCount === 0 && (summary.responseCount ?? 0) === 0) {
        setError('No approved improvements or questionnaire responses found')
        setIsLoading(false)
        return
      }

      console.log(`Starting CV comparison with ${summary.approvedCount} approved improvements and ${summary.responseCount ?? 0} questionnaire responses`)

      setIsLoading(true)
      setError(null)

      try {
        let generateResult
        let documentId: string

        // Step 1: Check if CV is already generated, otherwise generate it
        if (preGeneratedCV?.documentId && preGeneratedCV?.downloadUrl) {
          console.log('Using pre-generated CV...')
          generateResult = {
            success: true,
            documentId: preGeneratedCV.documentId,
            downloadUrl: preGeneratedCV.downloadUrl,
          }
          documentId = preGeneratedCV.documentId
          setDownloadUrl(preGeneratedCV.downloadUrl)
        } else {
          console.log('Generating updated CV...')
          generateResult = await generateUpdatedCV(sessionId)

          if (!generateResult.success || !generateResult.documentId) {
            throw new Error(generateResult.error || 'Failed to generate CV')
          }
          documentId = generateResult.documentId
          setDownloadUrl(generateResult.downloadUrl)
        }

        // Step 2: Get session to find original document ID
        const supabase = createClient()
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('state')
          .eq('id', sessionId)
          .single()

        if (sessionError || !session?.state?.documentId) {
          throw new Error('Failed to find original document')
        }

        // Step 3: Fetch original CV content
        console.log('Fetching original CV...')
        const originalResult = await getDocumentContent(session.state.documentId)

        if (!originalResult.success || !originalResult.content) {
          throw new Error(originalResult.error || 'Failed to fetch original CV')
        }

        setOriginalCV(originalResult.content)

        // Step 4: Fetch updated CV content
        console.log('Fetching updated CV...')
        const updatedResult = await getDocumentContent(documentId)

        if (!updatedResult.success || !updatedResult.content) {
          throw new Error(updatedResult.error || 'Failed to fetch updated CV')
        }

        setUpdatedCV(updatedResult.content)
      } catch (err) {
        console.error('Initialize comparison error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load CV comparison')
      } finally {
        setIsLoading(false)
      }
    }

    initializeComparison()
  }, [sessionId, summary.approvedCount, preGeneratedCV])

  // Show loading state
  if (isLoading) {
    const hasItems = summary.approvedCount > 0 || (summary.responseCount ?? 0) > 0
    const items = summary.approvedCount > 0
      ? `${summary.approvedCount} approved improvement${summary.approvedCount !== 1 ? 's' : ''}`
      : `${summary.responseCount ?? 0} questionnaire response${(summary.responseCount ?? 0) !== 1 ? 's' : ''}`

    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Generating Your Updated CV</h3>
              <p className="text-sm text-muted-foreground">
                {hasItems ? `Applying ${items}...` : 'Preparing your CV...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Show CV comparison
  return (
    <div className="space-y-6">
      {/* Success message */}
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              CV Generated Successfully!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Your updated CV has been generated with the approved improvements and questionnaire responses.
            </p>
          </div>
        </div>
      </div>

      <CVComparison
        originalCV={originalCV}
        updatedCV={updatedCV}
        downloadUrl={downloadUrl}
        approvedCount={summary.approvedCount}
        onBack={onBack}
      />
    </div>
  )
}
