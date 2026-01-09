'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Loader2, Upload, FileText, CheckCircle2, AlertCircle,
  ThumbsUp, BarChart3, Clock, Target, BookOpen, TrendingUp,
  AlertTriangle, Info, CheckSquare, Square, XCircle, Type,
} from 'lucide-react'
import {
  analyzeSkillGaps,
  getSkillGapResults,
  getSkillGapsByTimeline,
  getUserCVDocuments,
  validateJobDescription,
} from '@/actions/skill-gap'
import { DocumentSelector } from '@/components/documents/document-selector'
import { SkillGapResults } from './skill-gap-results'

interface SkillGap {
  id: string;
  skillName: string;
  category: 'technical' | 'soft' | 'domain';
  importance: 'critical' | 'important' | 'nice-to-have';
  currentLevel: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  requiredLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  timeline: 'short' | 'medium' | 'long';
  learningAdvice: string;
  gapDescription: string;
  reasoning: string;
  status: 'pending' | 'in_progress' | 'completed' | 'not_interested';
  learningResources: any[];
}

interface SkillGapAnalysis {
  overallMatch: {
    score: number;
    summary: string;
    strengths: string[];
    criticalGaps: string[];
  };
  skillGaps: SkillGap[];
  strengthsToHighlight: any[];
  generalAdvice: {
    overallStrategy: string;
    quickWins: string[];
    longTermGoals: string[];
    nextSteps: string[];
  };
  jobDescriptionQuality?: any;
}

export function SkillGapClient() {
  const [activeTab, setActiveTab] = useState('setup')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null)
  const [organizedGaps, setOrganizedGaps] = useState<{
    short: SkillGap[];
    medium: SkillGap[];
    long: SkillGap[];
  } | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('')
  const [selectedJdDocumentId, setSelectedJdDocumentId] = useState<string>('')
  const [jobDescription, setJobDescription] = useState('')
  const [jdInputTab, setJdInputTab] = useState<'file' | 'text'>('file')
  const [jobDescriptionValidation, setJobDescriptionValidation] = useState<any>(null)


  // Clear messages after 5 seconds
  const clearMessages = useCallback(() => {
    setTimeout(() => {
      setError(null)
      setSuccess(null)
    }, 5000)
  }, [])

  // Validate job description in real-time
  const validateJobDescriptionText = useCallback(async (text: string) => {
    if (text.length > 50) {
      const result = await validateJobDescription(text)
      if (result.success) {
        setJobDescriptionValidation(result.validation)
      }
    } else {
      setJobDescriptionValidation(null)
    }
  }, [])

  const handleJobDescriptionChange = (value: string) => {
    setJobDescription(value)
    validateJobDescriptionText(value)
  }

  const handleJdDocumentSelect = (documentId: string | null) => {
    setSelectedJdDocumentId(documentId || '')
    // Clear text input when selecting a document
    setJobDescription('')
    setJobDescriptionValidation(null)
    // Reset to file tab when selecting document
    if (documentId) {
      setJdInputTab('file')
    }
  }


  // Handle skill gap analysis
  const handleAnalyzeSkillGaps = useCallback(async (formData?: FormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const cvFile = formData?.get('cvFile') as File
      let cvFileData = ''
      let cvFileName = ''
      let cvFileType = ''
      let cvFileSize = 0

      // Handle file upload if provided
      if (cvFile && cvFile.size > 0) {
        const bytes = await cvFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        cvFileData = buffer.toString('base64')
        cvFileName = cvFile.name
        cvFileType = cvFile.type
        cvFileSize = cvFile.size
      }

      // Determine job description source
      let jobDescriptionText = jobDescription.trim()
      const jdDocumentId = selectedJdDocumentId || undefined

      // If using selected JD document, prioritize it over text input
      if (selectedJdDocumentId && jdInputTab === 'file') {
        jobDescriptionText = '' // Let backend fetch from document
      }

      const result = await analyzeSkillGaps({
        cvDocumentId: selectedDocumentId || undefined,
        cvFileName: cvFileName || undefined,
        cvFileType: cvFileType || undefined,
        cvFileSize: cvFileSize || undefined,
        cvFileData: cvFileData || undefined,
        jobDescriptionText,
        jdDocumentId,
      })

      if (result.success) {
        setSessionId(result.sessionId || null)
        setAnalysis(result.analysis || null)
        setSuccess('Skill gap analysis completed successfully!')
        setActiveTab('results')

        // Fetch organized results
        if (result.sessionId) {
          const organizedResult = await getSkillGapsByTimeline(result.sessionId)
          if (organizedResult.success && organizedResult.data) {
            setOrganizedGaps(organizedResult.data)
          }
        }
      } else {
        setError(result.error || 'Failed to analyze skill gaps')
      }
    } catch (error) {
      console.error('Skill gap analysis error:', error)
      setError('An unexpected error occurred during analysis')
    } finally {
      setIsLoading(false)
      clearMessages()
    }
  }, [selectedDocumentId, selectedJdDocumentId, jobDescription, jdInputTab])



  // Handle form submission
  const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    handleAnalyzeSkillGaps(formData)
  }, [handleAnalyzeSkillGaps])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h1 className="text-3xl font-bold">Skill Gap Analysis</h1>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!analysis} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="progress" disabled={!organizedGaps} className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Learning Plan
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Analyze Your Skill Gaps
              </CardTitle>
              <CardDescription>
                Compare your CV with a job description to identify skill gaps and create a learning plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* CV Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Your CV</Label>
                  <DocumentSelector
                    documentType="cv"
                    selectedDocumentId={selectedDocumentId}
                    onSelect={(documentId) => setSelectedDocumentId(documentId || '')}
                  />
                </div>

                {/* Job Description */}
                <div className="space-y-4">
                  <Label htmlFor="jobDescription" className="text-base font-medium">
                    Job Description
                  </Label>

                  <Tabs value={jdInputTab} onValueChange={(value) => setJdInputTab(value as 'file' | 'text')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="file" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Use Existing JD
                      </TabsTrigger>
                      <TabsTrigger value="text" className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Enter Text
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="space-y-3 mt-3">
                      <DocumentSelector
                        documentType="jd"
                        selectedDocumentId={selectedJdDocumentId}
                        onSelect={handleJdDocumentSelect}
                        placeholder="Select a job description..."
                      />
                    </TabsContent>

                    <TabsContent value="text" className="space-y-3 mt-3">
                      <Textarea
                        id="jobDescription"
                        placeholder="Paste the job description here. Include requirements, responsibilities, and qualifications for the best analysis..."
                        value={jobDescription}
                        onChange={(e) => {
                          handleJobDescriptionChange(e.target.value)
                          // Clear selected document when typing
                          if (selectedJdDocumentId) {
                            setSelectedJdDocumentId('')
                          }
                        }}
                        rows={8}
                        className="min-h-[200px]"
                      />
                    </TabsContent>
                  </Tabs>

                  {/* Job Description Validation */}
                  {jobDescriptionValidation && (
                    <Alert className={
                      jobDescriptionValidation.isSufficient
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                    }>
                      {jobDescriptionValidation.isSufficient ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium">
                            Job description quality: {jobDescriptionValidation.qualityScore}/100
                          </p>
                          {!jobDescriptionValidation.isSufficient && (
                            <div>
                              <p className="font-medium">Suggestions to improve:</p>
                              <ul className="list-disc list-inside text-sm">
                                {jobDescriptionValidation.suggestions.map((suggestion: string, index: number) => (
                                  <li key={index}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || (jdInputTab === 'text' && !jobDescription.trim()) || (jdInputTab === 'file' && !selectedJdDocumentId)}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Skill Gaps...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analyze Skill Gaps
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {analysis && (
            <SkillGapResults
              analysis={analysis}
              organizedGaps={organizedGaps}
            />
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          {organizedGaps && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Learning Timeline
                  </CardTitle>
                  <CardDescription>
                    Your skill gaps organized by learning timeline. Focus on short-term goals first to build momentum.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* Short-term (0-3 months) */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold">Quick Wins (0-3 months)</h3>
                        <Badge variant="secondary">{organizedGaps.short.length} skills</Badge>
                      </div>
                      {organizedGaps.short.length > 0 ? (
                        <div className="grid gap-4">
                          {organizedGaps.short.map((gap) => (
                            <Card key={gap.id} className="p-4">
                              <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{gap.skillName}</h4>
                                    <Badge variant={gap.importance === 'critical' ? 'destructive' : 'secondary'}>
                                      {gap.importance}
                                    </Badge>
                                    <Badge variant="outline">{gap.category}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{gap.learningAdvice}</p>
                                  <p className="text-xs text-gray-500">{gap.reasoning}</p>
                                </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No short-term skill gaps found!</p>
                      )}
                    </div>

                    {/* Medium-term (3-6 months) */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold">Medium-term Goals (3-6 months)</h3>
                        <Badge variant="secondary">{organizedGaps.medium.length} skills</Badge>
                      </div>
                      {organizedGaps.medium.length > 0 ? (
                        <div className="grid gap-4">
                          {organizedGaps.medium.map((gap) => (
                            <Card key={gap.id} className="p-4">
                              <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{gap.skillName}</h4>
                                    <Badge variant={gap.importance === 'critical' ? 'destructive' : 'secondary'}>
                                      {gap.importance}
                                    </Badge>
                                    <Badge variant="outline">{gap.category}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{gap.learningAdvice}</p>
                                  <p className="text-xs text-gray-500">{gap.reasoning}</p>
                                </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No medium-term skill gaps found!</p>
                      )}
                    </div>

                    {/* Long-term (6+ months) */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold">Long-term Goals (6+ months)</h3>
                        <Badge variant="secondary">{organizedGaps.long.length} skills</Badge>
                      </div>
                      {organizedGaps.long.length > 0 ? (
                        <div className="grid gap-4">
                          {organizedGaps.long.map((gap) => (
                            <Card key={gap.id} className="p-4">
                              <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-medium">{gap.skillName}</h4>
                                    <Badge variant={gap.importance === 'critical' ? 'destructive' : 'secondary'}>
                                      {gap.importance}
                                    </Badge>
                                    <Badge variant="outline">{gap.category}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{gap.learningAdvice}</p>
                                  <p className="text-xs text-gray-500">{gap.reasoning}</p>
                                </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No long-term skill gaps found!</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
