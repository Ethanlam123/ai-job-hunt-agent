'use client'

import { useState } from 'react'
import { uploadDocument, deleteDocument } from '@/actions/documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { DocumentType } from '@/lib/types'

interface Document {
  id: string
  original_filename: string
  document_type: string
  file_format: string
  created_at: string
  metadata?: any
}

interface DocumentsClientProps {
  initialDocuments: Document[]
}

export function DocumentsClient({ initialDocuments }: DocumentsClientProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('cv')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('documentType', documentType)

    try {
      const result = await uploadDocument(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Document uploaded successfully!')
        setDocuments((prev) => [result.document, ...prev])
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const result = await deleteDocument(documentId)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Document deleted successfully!')
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold">Upload New Document</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="file-upload">File (PDF, DOCX, TXT)</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cv">CV / Resume</SelectItem>
                <SelectItem value="cover_letter">Cover Letter</SelectItem>
                <SelectItem value="jd">Job Description</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <h3 className="font-semibold">Your Documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No documents uploaded yet.</p>
            <p className="text-sm">Upload a document to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{doc.original_filename}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="capitalize">{doc.document_type?.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="uppercase">{doc.file_format}</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.metadata?.size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
