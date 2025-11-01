'use client'

import { useState, useEffect } from 'react'
import { getUserDocuments } from '@/actions/documents'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import type { DocumentType } from '@/lib/types'

interface Document {
  id: string
  original_filename: string
  document_type: string
  file_format: string
  created_at: string
}

interface DocumentSelectorProps {
  documentType: DocumentType
  onSelect: (documentId: string | null) => void
  selectedDocumentId?: string | null
  label?: string
  placeholder?: string
}

export function DocumentSelector({
  documentType,
  onSelect,
  selectedDocumentId,
  label = 'Select Document',
  placeholder = 'Choose a document',
}: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
  }, [documentType])

  const loadDocuments = async () => {
    setIsLoading(true)
    const result = await getUserDocuments(documentType)
    if (result.success && result.documents) {
      setDocuments(result.documents)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading documents...</div>
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="border rounded-lg p-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            No {documentType === 'cv' ? 'CVs' : documentType === 'jd' ? 'job descriptions' : 'documents'} found
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/documents">Upload Document</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="document-selector">{label}</Label>
      <div className="flex gap-2">
        <Select value={selectedDocumentId || ''} onValueChange={(value) => onSelect(value || null)}>
          <SelectTrigger id="document-selector" className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {documents.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                {doc.original_filename} ({new Date(doc.created_at).toLocaleDateString()})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="outline" size="icon">
          <Link href="/documents" title="Manage documents">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </Link>
        </Button>
      </div>
    </div>
  )
}
