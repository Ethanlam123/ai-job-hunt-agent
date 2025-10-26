'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { uploadDocument } from '@/actions/documents'
import { toast } from 'sonner'
import type { DocumentType } from '@/lib/types'

interface FileUploaderProps {
  documentType: DocumentType
  sessionId?: string
  onUploadComplete?: (document: any) => void
}

export function FileUploader({ documentType, sessionId, onUploadComplete }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getTitle = () => {
    switch (documentType) {
      case 'cv':
        return 'Upload Your CV/Resume'
      case 'jd':
        return 'Upload Job Description'
      case 'cover_letter':
        return 'Upload Cover Letter'
      default:
        return 'Upload Document'
    }
  }

  const getDescription = () => {
    switch (documentType) {
      case 'cv':
        return 'Upload your CV or resume in PDF, DOCX, or TXT format (max 10MB)'
      case 'jd':
        return 'Upload the job description you want to apply for (max 10MB)'
      case 'cover_letter':
        return 'Upload your existing cover letter for analysis (max 10MB)'
      default:
        return 'Upload a document in PDF, DOCX, or TXT format (max 10MB)'
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit')
        return
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only PDF, DOCX, and TXT files are allowed')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentType', documentType)
      if (sessionId) {
        formData.append('sessionId', sessionId)
      }

      const result = await uploadDocument(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('File uploaded successfully!')
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        if (onUploadComplete && result.document) {
          onUploadComplete(result.document)
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90
              file:cursor-pointer cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {selectedFile && (
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Selected file:</p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p>{(selectedFile.size / 1024).toFixed(2)} KB</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isUploading}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
