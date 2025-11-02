'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Eye, Loader2 } from 'lucide-react'
import { getDocumentById } from '@/actions/documents'

interface DocumentPreviewDialogProps {
  documentId: string
  filename: string
}

interface ParsedContent {
  fullText?: string
  pageCount?: number
  wordCount?: number
  sections?: Record<string, string>
}

export function DocumentPreviewDialog({ documentId, filename }: DocumentPreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [content, setContent] = useState<ParsedContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadContent = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getDocumentById(documentId)
      if (result.error || !result.document) {
        setError(result.error || 'Failed to load document')
      } else {
        setContent(result.document.parsed_content)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !content && !error) {
      loadContent()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{filename}</DialogTitle>
          <DialogDescription>Document preview and metadata</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive py-4">
            {error}
          </div>
        )}

        {content && !isLoading && (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="flex gap-4 text-sm text-muted-foreground pb-4 border-b">
              {content.pageCount !== undefined && content.pageCount > 0 && (
                <span>{content.pageCount} page{content.pageCount !== 1 ? 's' : ''}</span>
              )}
              {content.wordCount !== undefined && content.wordCount > 0 && (
                <>
                  <span>•</span>
                  <span>{content.wordCount.toLocaleString()} words</span>
                </>
              )}
            </div>

            {/* Sections */}
            {content.sections && Object.keys(content.sections).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Extracted Sections</h3>
                <div className="space-y-3">
                  {Object.entries(content.sections).map(([section, text]) => (
                    <div key={section} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm capitalize mb-3 text-foreground">{section}</h4>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded p-3 max-h-[300px] overflow-y-auto">
                        {text || 'No content'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Text */}
            {content.fullText && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Full Content</h3>
                <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-muted/30">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {content.fullText}
                  </pre>
                </div>
              </div>
            )}

            {!content.fullText && (!content.sections || Object.keys(content.sections).length === 0) && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No content available for preview
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
