'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Upload, Loader2, Download, Edit2, Sparkles } from 'lucide-react'
import { generateCoverLetter } from '@/actions/cover-letter'
import { getDocumentById } from '@/actions/documents'
import { DocumentSelector } from '@/components/documents/document-selector'

export function CoverLetterClient() {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null)
  const [cvMode, setCvMode] = useState<'existing' | 'new'>('existing')
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [positionTitle, setPositionTitle] = useState('')
  const [hiringManagerName, setHiringManagerName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedLetter, setEditedLetter] = useState('')
  const [activeTab, setActiveTab] = useState('input')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(file.type)) {
        setError('Only PDF, DOCX, and TXT files are supported')
        return
      }
      setCvFile(file)
      setError(null)
    }
  }

  const handleGenerate = async () => {
    // Validate CV selection
    if (cvMode === 'new' && !cvFile) {
      setError('Please upload your CV')
      return
    }
    if (cvMode === 'existing' && !selectedCvId) {
      setError('Please select an existing CV')
      return
    }
    if (!jobDescription.trim()) {
      setError('Please provide a job description')
      return
    }
    if (!companyName.trim() || !positionTitle.trim()) {
      setError('Please provide company name and position title')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      let fileData: { fileName: string; fileType: string; fileSize: number; fileData: string; documentId?: string }

      if (cvMode === 'existing' && selectedCvId) {
        // Use existing document
        const docResult = await getDocumentById(selectedCvId)
        if (!docResult.success || !docResult.document) {
          throw new Error('Failed to load selected CV')
        }

        fileData = {
          fileName: docResult.document.original_filename,
          fileType: docResult.document.metadata?.mimeType || 'application/pdf',
          fileSize: docResult.document.metadata?.size || 0,
          fileData: '',
          documentId: selectedCvId,
        }
      } else if (cvFile) {
        // Upload new file
        const arrayBuffer = await cvFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')

        fileData = {
          fileName: cvFile.name,
          fileType: cvFile.type,
          fileSize: cvFile.size,
          fileData: base64,
        }
      } else {
        throw new Error('No CV selected')
      }

      const result = await generateCoverLetter({
        ...fileData,
        jobDescription,
        companyName,
        positionTitle,
        hiringManagerName
      })

      if (result.error) {
        setError(result.error)
      } else if (result.coverLetter) {
        setGeneratedLetter(result.coverLetter)
        setEditedLetter(result.coverLetter)
        setActiveTab('preview') // Automatically switch to preview tab
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover letter')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    const content = isEditing ? editedLetter : generatedLetter
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cover-letter-${companyName.toLowerCase().replace(/\s+/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSaveEdit = () => {
    setGeneratedLetter(editedLetter)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedLetter}>Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Your CV
              </CardTitle>
              <CardDescription>
                Choose an existing CV or upload a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={cvMode} onValueChange={(value) => setCvMode(value as 'existing' | 'new')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="existing">Use Existing CV</TabsTrigger>
                  <TabsTrigger value="new">Upload New CV</TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-4">
                  <DocumentSelector
                    documentType="cv"
                    onSelect={setSelectedCvId}
                    selectedDocumentId={selectedCvId}
                    label="Select Your CV"
                    placeholder="Choose a CV"
                  />
                </TabsContent>

                <TabsContent value="new" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cv-upload"
                    />
                    <label htmlFor="cv-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-1">
                        {cvFile ? cvFile.name : 'Click to upload your CV'}
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOCX, or TXT (max 10MB)</p>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Details
              </CardTitle>
              <CardDescription>
                Provide information about the position you're applying for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Anthropic"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position Title *</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Senior Software Engineer"
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hiring-manager">Hiring Manager Name (Optional)</Label>
                <Input
                  id="hiring-manager"
                  placeholder="e.g., Jane Smith"
                  value={hiringManagerName}
                  onChange={(e) => setHiringManagerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-description">Job Description *</Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={10}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !cvFile || !jobDescription.trim() || !companyName.trim() || !positionTitle.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Cover Letter...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {generatedLetter && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Your Cover Letter</CardTitle>
                      <CardDescription>
                        {isEditing ? 'Edit your cover letter' : 'Review and download your cover letter'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="outline" onClick={() => {
                            setEditedLetter(generatedLetter)
                            setIsEditing(false)
                          }}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveEdit}>
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => setIsEditing(true)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button onClick={handleDownload}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedLetter}
                      onChange={(e) => setEditedLetter(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {generatedLetter}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
