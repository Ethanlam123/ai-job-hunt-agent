'use client'

import React, { useState, useEffect } from 'react'
import { SessionCard, EmptyState } from '@/components/history'
import { SessionDetails } from '@/components/history/session-details'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, RefreshCw } from 'lucide-react'
import { getUserSessions } from '@/actions/history'
import type { SessionSummary, HistoryPageClientProps } from '@/components/history/types'

export function HistoryClient({ initialSessions }: HistoryPageClientProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Check if we need to load more data based on initial load
  useEffect(() => {
    setHasMore(initialSessions.length === 20) // If we got 20 items, there might be more
  }, [initialSessions])

  const loadMoreSessions = async () => {
    if (loading || !hasMore) return

    try {
      setLoading(true)
      const result = await getUserSessions({ limit: 20, offset: sessions.length })

      if (result.success && result.data) {
        const newSummaries = result.data.map(session => {
          // Convert to summary format using the actual database response structure
          const cvDocument = session.documents?.find((doc: any) => doc.documentType === 'cv')
          const jdDocument = session.documents?.find((doc: any) => doc.documentType === 'jd')

          let status: 'completed' | 'processing' | 'failed' = 'processing'
          if (session.completedAt) {
            status = 'completed'
          } else if (session.state?.error) {
            status = 'failed'
          }

          // Create stage display name
          const stageDisplay = session.currentStage?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'

          // Create result summary
          let resultSummary = 'Analysis completed'
          if (session.resultCounts) {
            if (session.currentStage === 'skill_gap' || session.currentStage === 'skill-gap') {
              resultSummary = `${session.resultCounts.skillGaps} skills identified for development`
            } else if (session.currentStage === 'interview_preparation') {
              resultSummary = `${session.resultCounts.interviewQuestions} practice questions generated`
            } else if (session.currentStage === 'generating_cover_letter') {
              resultSummary = session.resultCounts.coverLetters > 0 ? 'Cover letter generated successfully' : 'Cover letter generation in progress'
            }
          }

          return {
            id: session.id,
            analysisType: session.analysisType || 'general',
            stageDisplay,
            createdAt: session.createdAt,
            status,
            cvDocument,
            jdDocument,
            resultSummary
          }
        })

        setSessions(prev => [...prev, ...newSummaries])
        setHasMore(result.hasMore || false)
      } else {
        setError(result.error || 'Failed to load more sessions')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error loading more sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSessionClick = (sessionId: string) => {
    setSelectedSessionId(sessionId)
  }

  const handleBackToHistory = () => {
    setSelectedSessionId(null)
  }

  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getUserSessions({ limit: 20, offset: 0 })

      if (result.success && result.data) {
        const newSummaries = result.data.map(session => {
          // Convert to summary format using the actual database response structure
          const cvDocument = session.documents?.find((doc: any) => doc.documentType === 'cv')
          const jdDocument = session.documents?.find((doc: any) => doc.documentType === 'jd')

          let status: 'completed' | 'processing' | 'failed' = 'processing'
          if (session.completedAt) {
            status = 'completed'
          } else if (session.state?.error) {
            status = 'failed'
          }

          // Create stage display name
          const stageDisplay = session.currentStage?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'

          // Create result summary
          let resultSummary = 'Analysis completed'
          if (session.resultCounts) {
            if (session.currentStage === 'skill_gap' || session.currentStage === 'skill-gap') {
              resultSummary = `${session.resultCounts.skillGaps} skills identified for development`
            } else if (session.currentStage === 'interview_preparation') {
              resultSummary = `${session.resultCounts.interviewQuestions} practice questions generated`
            } else if (session.currentStage === 'generating_cover_letter') {
              resultSummary = session.resultCounts.coverLetters > 0 ? 'Cover letter generated successfully' : 'Cover letter generation in progress'
            }
          }

          return {
            id: session.id,
            analysisType: session.analysisType || 'general',
            stageDisplay,
            createdAt: session.createdAt,
            status,
            cvDocument,
            jdDocument,
            resultSummary
          }
        })

        setSessions(newSummaries)
        setHasMore(result.hasMore || false)
      } else {
        setError(result.error || 'Failed to refresh sessions')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error refreshing sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Show session details if a session is selected
  if (selectedSessionId) {
    return (
      <SessionDetails
        sessionId={selectedSessionId}
        onBack={handleBackToHistory}
      />
    )
  }

  // Show loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your past sessions
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Show error state
  if (error && sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your past sessions
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load session history</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your past sessions
          </p>
        </div>
        {sessions.length > 0 && (
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        )}
      </div>

      {/* Sessions List or Empty State */}
      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </div>

          <div className="grid gap-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={handleSessionClick}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={loadMoreSessions}
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}

          {/* Error message for load more */}
          {error && sessions.length > 0 && (
            <div className="text-center text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}