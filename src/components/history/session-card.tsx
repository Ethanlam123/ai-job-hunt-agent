'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Eye, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionCardProps } from './types'

export function SessionCard({ session, onClick, className }: SessionCardProps) {
  const getStatusIcon = () => {
    switch (session.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (session.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Unknown date'

    let dateObj: Date
    if (typeof date === 'string') {
      // Handle PostgreSQL timestamp format
      try {
        dateObj = new Date(date)
      } catch (error) {
        console.error('Error parsing date string:', date, error)
        return 'Invalid date'
      }
    } else {
      dateObj = date
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date value:', date)
      return 'Invalid date'
    }

    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj)
    } catch (error) {
      console.error('Error formatting date:', dateObj, error)
      return 'Invalid date'
    }
  }

  const getAnalysisTypeColor = () => {
    switch (session.analysisType || 'unknown') {
      case 'cv_analysis':
      case 'cv-analysis':
        return 'bg-blue-100 text-blue-800'
      case 'skill_gap':
      case 'skill-gap':
        return 'bg-purple-100 text-purple-800'
      case 'interview_preparation':
      case 'interview-preparation':
        return 'bg-orange-100 text-orange-800'
      case 'generating_cover_letter':
      case 'cover-letter':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-l-4',
        session.status === 'completed' && 'border-l-green-500',
        session.status === 'processing' && 'border-l-yellow-500',
        session.status === 'failed' && 'border-l-red-500',
        className,
      )}
      onClick={() => onClick(session.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {session.stageDisplay}
            <Badge
              variant="outline"
              className={cn('text-xs', getAnalysisTypeColor())}
            >
              {(session.analysisType || 'unknown').replace(/_/g, ' ')}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge
              variant="outline"
              className={cn('text-xs', getStatusColor())}
            >
              {session.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Date and Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(session.createdAt)}</span>
          </div>

          {/* Documents */}
          <div className="space-y-2">
            {session.cvDocument && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium">CV:</span>
                <span className="text-muted-foreground truncate max-w-[200px]">
                  {session.cvDocument.originalFilename}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({session.cvDocument.fileFormat.toUpperCase()})
                </span>
              </div>
            )}

            {session.jdDocument && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-green-500" />
                <span className="font-medium">Job Description:</span>
                <span className="text-muted-foreground truncate max-w-[200px]">
                  {session.jdDocument.originalFilename}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({session.jdDocument.fileFormat.toUpperCase()})
                </span>
              </div>
            )}
          </div>

          {/* Result Summary */}
          <div className="text-sm text-muted-foreground">
            {session.resultSummary}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation()
                onClick(session.id)
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
