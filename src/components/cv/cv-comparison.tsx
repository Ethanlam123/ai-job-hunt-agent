'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText } from 'lucide-react'

interface CVComparisonProps {
  originalCV: string;
  updatedCV: string;
  downloadUrl: string | null;
  approvedCount: number;
  onBack: () => void;
}

export function CVComparison({
  originalCV,
  updatedCV,
  downloadUrl,
  approvedCount,
  onBack,
}: CVComparisonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Your Updated CV
              </CardTitle>
              <CardDescription className="mt-2">
                {approvedCount} improvement{approvedCount !== 1 ? 's' : ''} applied to your CV
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {downloadUrl && (
                <Button onClick={() => window.open(downloadUrl, '_blank')}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original CV */}
        <Card className="border-gray-300 dark:border-gray-600">
          <CardHeader className="bg-gray-50 dark:bg-gray-800">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Original CV</span>
              <Badge variant="outline" className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">Before</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-md border dark:border-gray-700 max-h-[600px] overflow-y-auto text-gray-800 dark:text-gray-200">
                {originalCV}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Updated CV */}
        <Card className="border-green-300 bg-green-50/30 dark:border-green-600 dark:bg-green-500/10">
          <CardHeader className="bg-green-100 dark:bg-green-500/20">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Updated CV</span>
              <Badge className="bg-green-600 text-white">After</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-xs font-mono bg-white dark:bg-gray-900 p-4 rounded-md border border-green-200 dark:border-green-600 max-h-[600px] overflow-y-auto text-gray-800 dark:text-gray-200">
                {updatedCV}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Section */}
      {downloadUrl && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-600 dark:bg-blue-500/10">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Your updated CV is ready!</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Download your improved CV as a markdown file.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <Download className="mr-2 h-5 w-5" />
                Download CV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
