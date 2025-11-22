'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { History, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmptyStateProps } from './types'
import Link from 'next/link'

export function EmptyState({ onNavigateToDashboard, className }: EmptyStateProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl text-center">
            No sessions yet
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center leading-relaxed">
            Complete an analysis from the dashboard to see your sessions here.
            Your history will appear as you use the CV analysis, skill gap,
            cover letter, and interview preparation features.
          </p>

          <div className="pt-4">
            {onNavigateToDashboard ? (
              <Button
                onClick={onNavigateToDashboard}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Link href="/dashboard">
                <Button className="w-full" size="lg">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>• <strong>CV Analysis:</strong> Get AI-powered feedback on your resume</p>
            <p>• <strong>Skill Gap:</strong> Identify skills to develop for your target roles</p>
            <p>• <strong>Interview Prep:</strong> Practice with mock interview questions</p>
            <p>• <strong>Cover Letters:</strong> Generate personalized cover letters</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}