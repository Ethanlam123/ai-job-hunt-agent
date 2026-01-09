'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSessionDetails } from '@/actions/history'
import type { SessionDetailsProps } from './types'

export function SessionDetails({ sessionId, onBack, className }: SessionDetailsProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSessionDetails = async () => {
      try {
        setLoading(true)
        const result = await getSessionDetails({ sessionId })

        if (result.success) {
          setSession(result.data)
        } else {
          setError(result.error || 'Failed to load session details')
        }
      } catch (err) {
        setError('An unexpected error occurred')
        console.error('Error loading session details:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSessionDetails()
  }, [sessionId])

  const getStatusIcon = () => {
    if (session?.completedAt) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (session?.state?.error) {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }
    return <Clock className="h-5 w-5 text-yellow-500" />
  }

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const getStageDisplayName = (stage: string | null) => {
    if (!stage) return 'Unknown'

    const stageNames: Record<string, string> = {
      'cv_analysis': 'CV Analysis',
      'skill_gap': 'Skill Gap Analysis',
      'interview_preparation': 'Interview Preparation',
      'generating_cover_letter': 'Cover Letter Generation',
      'skill-gap': 'Skill Gap Analysis',
    }

    return stageNames[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const renderAnalysisResults = () => {
    if (!session?.results) return null

    const { results } = session

    switch (session.currentStage) {
      case 'cv_analysis':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.messages && results.messages.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Insights</h4>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">
                        CV analysis completed with improvement suggestions.
                        {results.messages.length > 0 && ` ${results.messages.length} messages exchanged.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 'skill_gap':
      case 'skill-gap':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Skills Identified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.skillGaps && results.skillGaps.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {results.skillGaps.length} skills identified for development:
                    </p>
                    <div className="grid gap-2">
                      {results.skillGaps.slice(0, 10).map((skill: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <h4 className="font-medium">{skill.skillName}</h4>
                            {skill.category && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {skill.category}
                              </Badge>
                            )}
                          </div>
                          {skill.importance && (
                            <Badge variant="secondary" className="text-xs">
                              {skill.importance}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {results.skillGaps.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center">
                          ... and {results.skillGaps.length - 10} more skills
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No skill gaps were identified in this analysis.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 'interview_preparation':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interview Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.interviewQuestions && results.interviewQuestions.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {results.interviewQuestions.length} practice questions generated:
                    </p>
                    <div className="space-y-3">
                      {results.interviewQuestions.slice(0, 5).map((question: any, index: number) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">Question {index + 1}</h4>
                            <div className="flex gap-2">
                              {question.questionType && (
                                <Badge variant="outline" className="text-xs">
                                  {question.questionType}
                                </Badge>
                              )}
                              {question.difficulty && (
                                <Badge variant="secondary" className="text-xs">
                                  {question.difficulty}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{question.questionText}</p>
                        </div>
                      ))}
                      {results.interviewQuestions.length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          ... and {results.interviewQuestions.length - 5} more questions
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No interview questions were generated.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 'generating_cover_letter':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.coverLetter ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">
                        Cover letter generated successfully
                      </p>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">
                        {results.coverLetter.content?.substring(0, 500)}
                        {results.coverLetter.content?.length > 500 && '...'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Cover letter generation was not completed.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Session completed successfully.
              </p>
            </CardContent>
          </Card>
        )
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Session</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
      </div>

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {getStageDisplayName(session?.currentStage)}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <Badge variant="outline">
                {session?.completedAt ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Created:</span>
              <span className="text-muted-foreground">
                {session?.createdAt && formatDate(session.createdAt)}
              </span>
            </div>
            {session?.completedAt && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Completed:</span>
                <span className="text-muted-foreground">
                  {formatDate(session.completedAt)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      {session?.documents && session.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documents Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {session.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">{doc.original_filename || doc.originalFilename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {(doc.document_type || doc.documentType)?.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(doc.file_format || doc.fileFormat)?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {renderAnalysisResults()}
    </div>
  )
}
