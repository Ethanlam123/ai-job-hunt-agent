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
import { DocumentPreviewDialog } from './document-preview-dialog'
import { BriefcaseIcon, SearchIcon } from 'lucide-react'

interface Document {
  id: string
  original_filename: string
  document_type: string
  file_format: string
  created_at: string
  metadata?: any
  parsed_content?: any
}

interface JobDescriptionSelectorProps {
  onSelect: (documentId: string | null) => void
  selectedDocumentId?: string | null
  label?: string
  placeholder?: string
}

export function JobDescriptionSelector({
  onSelect,
  selectedDocumentId,
  label = 'Select Job Description',
  placeholder = 'Choose a job description for enhanced analysis',
}: JobDescriptionSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)

  useEffect(() => {
    loadJobDescriptions()
  }, [])

  const loadJobDescriptions = async () => {
    setIsLoading(true)
    try {
      const result = await getUserDocuments()
      if (result.success && result.documents) {
        console.log('All documents loaded:', result.documents.map(doc => ({
          id: doc.id,
          type: doc.document_type,
          filename: doc.original_filename
        })))

        // Filter for job descriptions from all features
        const jobDescriptions = result.documents.filter(doc => {
          const filename = doc.original_filename.toLowerCase();
          const docType = doc.document_type;

          // Debug logging for each document
          console.log(`Filtering document: ${doc.original_filename} (type: ${docType})`);

          // Check if it's a job description by multiple criteria
          const isJobDescType = docType === 'jd' || docType === 'job_description';
          const isJobDescFilename = filename.includes('job') ||
                                   filename.includes('position') ||
                                   filename.includes('role') ||
                                   filename.includes('description') ||
                                   filename.includes('posting') ||
                                   filename.includes('opportunity');
          const isFromOtherFeature = docType === 'cover_letter_jd' ||
                                    docType === 'interview_jd' ||
                                    docType === 'skill_gap_jd';

          const isJobDescription = isJobDescType || isJobDescFilename || isFromOtherFeature;

          if (isJobDescription) {
            console.log(`✅ Found job description: ${doc.original_filename}`);
          }

          return isJobDescription;
        })

        console.log(`Total job descriptions found: ${jobDescriptions.length}`);
        setDocuments(jobDescriptions)
      }
    } catch (error) {
      console.error('Failed to load job descriptions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentSelect = (documentId: string) => {
    onSelect(documentId)
  }

  const handlePreview = (document: Document) => {
    setPreviewDocument(document)
    setShowPreview(true)
  }

  const getDocumentSource = (doc: Document) => {
    const filename = doc.original_filename.toLowerCase();

    switch (doc.document_type) {
      case 'job_description':
      case 'jd':
        return 'Direct upload'
      case 'cover_letter_jd':
        return 'From cover letters'
      case 'interview_jd':
        return 'From interview prep'
      case 'skill_gap_jd':
        return 'From skill analysis'
      default:
        // Try to infer from filename
        if (filename.includes('job') || filename.includes('position') || filename.includes('role')) {
          return 'Job description file'
        }
        return 'Document'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Loading job descriptions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectedDocumentId || ''}
        onValueChange={handleDocumentSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {documents.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground">
              <BriefcaseIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No job descriptions found</p>
              <p className="text-xs mt-1">
                Upload job descriptions in other features to see them here
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <BriefcaseIcon className="w-4 h-4" />
                    <div>
                      <div className="font-medium truncate max-w-48">
                        {doc.original_filename}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getDocumentSource(doc)} • {formatDate(doc.created_at)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePreview(doc)
                    }}
                    className="ml-2"
                  >
                    <SearchIcon className="w-3 h-3" />
                  </Button>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {previewDocument && (
        <DocumentPreviewDialog
          document={previewDocument}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      )}

      {documents.length === 0 && (
        <div className="text-xs text-muted-foreground">
          <p>Tip: Upload job descriptions through skill analysis, cover letter generation, or interview preparation to see them here.</p>
        </div>
      )}
    </div>
  )
}