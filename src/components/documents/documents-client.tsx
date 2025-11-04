'use client'

import { useState } from 'react'
import { uploadDocument, deleteDocument } from '@/actions/documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type { DocumentType } from '@/lib/types'
import { DocumentPreviewDialog } from './document-preview-dialog'

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
  const [jdText, setJdText] = useState('')
  const [inputTab, setInputTab] = useState<'file' | 'text'>('file')

  // JD metadata fields
  const [companyName, setCompanyName] = useState('')
  const [positionName, setPositionName] = useState('')
  const [hiringManagerName, setHiringManagerName] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDocumentTypeChange = (value: DocumentType) => {
    setDocumentType(value)
    // Reset to file tab when switching away from JD
    if (value !== 'jd') {
      setInputTab('file')
      // Clear JD metadata when switching away from JD
      setCompanyName('')
      setPositionName('')
      setHiringManagerName('')
      setJdText('')
    }
  }

  const handleUpload = async () => {
    // Validation based on document type and input method
    if (documentType === 'jd') {
      // Validate JD metadata fields
      if (!companyName.trim()) {
        toast.error('Please enter the company name')
        return
      }
      if (!positionName.trim()) {
        toast.error('Please enter the position name')
        return
      }

      if (inputTab === 'text') {
        if (!jdText.trim()) {
          toast.error('Please enter job description text')
          return
        }
      } else {
        if (!selectedFile) {
          toast.error('Please select a file to upload')
          return
        }
      }
    } else {
      if (!selectedFile) {
        toast.error('Please select a file to upload')
        return
      }
    }

    setIsUploading(true)
    const formData = new FormData()

    if (documentType === 'jd') {
      // Add JD metadata
      formData.append('companyName', companyName.trim())
      formData.append('positionName', positionName.trim())
      if (hiringManagerName.trim()) {
        formData.append('hiringManagerName', hiringManagerName.trim())
      }

      if (inputTab === 'text') {
        formData.append('jdText', jdText.trim())
        formData.append('documentType', documentType)
      } else {
        formData.append('file', selectedFile)
        formData.append('documentType', documentType)
      }
    } else {
      formData.append('file', selectedFile)
      formData.append('documentType', documentType)
    }

    try {
      const result = await uploadDocument(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Document uploaded successfully!')
        setDocuments((prev) => [result.document, ...prev])
        setSelectedFile(null)
        // Clear JD-specific fields
        setCompanyName('')
        setPositionName('')
        setHiringManagerName('')
        setJdText('')
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentType} onValueChange={handleDocumentTypeChange}>
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

          {documentType === 'jd' ? (
            <>
              {/* JD Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    placeholder="e.g., Google, Microsoft, Startup Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={isUploading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position-name">Position Name *</Label>
                  <Input
                    id="position-name"
                    placeholder="e.g., Senior Software Engineer, Product Manager"
                    value={positionName}
                    onChange={(e) => setPositionName(e.target.value)}
                    disabled={isUploading}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hiring-manager-name">Hiring Manager Name (Optional)</Label>
                  <Input
                    id="hiring-manager-name"
                    placeholder="e.g., John Smith, Sarah Johnson"
                    value={hiringManagerName}
                    onChange={(e) => setHiringManagerName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <Tabs value={inputTab} onValueChange={(value) => setInputTab(value as 'file' | 'text')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="text">Enter Text</TabsTrigger>
                </TabsList>
                <TabsContent value="file" className="space-y-2">
                  <Label htmlFor="file-upload">File (PDF, DOCX, TXT)</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </TabsContent>
                <TabsContent value="text" className="space-y-2">
                  <Label htmlFor="jd-text">Job Description Text</Label>
                  <Textarea
                    id="jd-text"
                    placeholder="Paste or type the job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    disabled={isUploading}
                    rows={8}
                    className="min-h-[200px]"
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
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
          )}
        </div>
        <Button
          onClick={handleUpload}
          disabled={isUploading || (
            documentType === 'jd'
              ? (!companyName.trim() || !positionName.trim() ||
                  (inputTab === 'text' && !jdText.trim()) ||
                  (inputTab === 'file' && !selectedFile))
              : !selectedFile
          )}
        >
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

                  {/* Show JD metadata if available */}
                  {doc.document_type === 'jd' && doc.metadata && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {doc.metadata.companyName && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Company:</span>
                          <span>{doc.metadata.companyName}</span>
                        </div>
                      )}
                      {doc.metadata.positionName && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Position:</span>
                          <span>{doc.metadata.positionName}</span>
                        </div>
                      )}
                      {doc.metadata.hiringManagerName && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Hiring Manager:</span>
                          <span>{doc.metadata.hiringManagerName}</span>
                        </div>
                      )}
                    </div>
                  )}

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
                <div className="flex gap-2">
                  <DocumentPreviewDialog documentId={doc.id} filename={doc.original_filename} />
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
