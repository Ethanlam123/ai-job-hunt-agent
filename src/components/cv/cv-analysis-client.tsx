"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, ThumbsUp, ThumbsDown, Sparkles, BarChart3, BriefcaseIcon, ArrowRightIcon, MessageSquare, User } from "lucide-react";
import {
  uploadAndAnalyzeCV,
  getAnalysisResults,
  getPendingApprovals,
  handleApprovalDecision,
  getApprovalSummary,
  generateCVQuestions,
  getCVQuestions,
  saveCVResponses,
  getCVResponses,
  generateUpdatedCV
} from "@/actions/cv";
import { getDocumentById } from "@/actions/documents";
import { DocumentSelector } from "@/components/documents/document-selector";
import { JobDescriptionSelector } from "@/components/documents/job-description-selector";
import { ApprovalSummary } from "./approval-summary";
import { ResponseForm } from "./response-form";

interface AnalysisData {
  overallScore: number;
  sections: Record<string, any>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface Improvement {
  id: string;
  type: string;
  section: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  improvementType?: string; // Optional property for improvement categorization
  jobContext?: string; // Optional job-specific context
}

interface ApprovalItem {
  id: string;
  change_type: string;
  proposed_content: Improvement;
  original_content?: any;
  status: string;
  created_at: string;
}

interface ApprovalSummaryData {
  total: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approved: Array<{
    id: string;
    changeType: string;
    content: any;
    decidedAt: string;
  }>;
  rejected: Array<{
    id: string;
    changeType: string;
    content: any;
    feedback: string;
    decidedAt: string;
  }>;
  pending: Array<{
    id: string;
    changeType: string;
    content: any;
  }>;
}

type WorkflowStep = 'upload' | 'analyzing' | 'results' | 'approvals' | 'information_collection' | 'summary';

export function CVAnalysisClient() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'existing' | 'new'>('existing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingApprovals, setProcessingApprovals] = useState<Set<string>>(() => new Set());
  const [summary, setSummary] = useState<ApprovalSummaryData | null>(null);

  // New state for job description
  const [selectedJobDescriptionId, setSelectedJobDescriptionId] = useState<string | null>(null);
  const [includeJobDescription, setIncludeJobDescription] = useState<boolean>(false);
  const [scores, setScores] = useState<{ overall: number; jobFit?: number } | null>(null);

  // State for tab interface
  const [activeResultsTab, setActiveResultsTab] = useState<'general' | 'jobSpecific' | 'combined'>('combined');

  // State for information collection
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Record<string, string>>({});
  const [isSubmittingResponses, setIsSubmittingResponses] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // State for CV generation
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);
  const [generatedCVResult, setGeneratedCVResult] = useState<{
    documentId: string | null;
    downloadUrl: string | null;
  }>({ documentId: null, downloadUrl: null });

  // Handle scrolling and summary loading when step changes to summary
  useEffect(() => {
    console.log('useEffect triggered, currentStep:', currentStep);
    if (currentStep === 'summary') {
      console.log('Step changed to summary, loading data and scrolling to top...');
      console.log('summary state:', summary);
      console.log('sessionId state:', sessionId);
      console.log('generatedCVResult state:', generatedCVResult);

      // Load summary data if not available
      if (!summary && sessionId) {
        console.log('Loading summary data...');
        getApprovalSummary(sessionId).then(response => {
          if (response.success && response.summary) {
            console.log('Summary loaded successfully:', response.summary);
            setSummary(response.summary);
          } else {
            console.warn('Failed to load summary:', response.error);
          }
        }).catch(err => {
          console.error('Error loading summary:', err);
        });
      }

      // Small delay to ensure DOM has updated
      const scrollTimer = setTimeout(() => {
        console.log('Executing scroll after timeout...');
        // Try multiple scrolling methods for better compatibility
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('Smooth scroll attempted');
        } catch (e) {
          console.warn('Smooth scroll failed, using instant scroll');
          window.scrollTo(0, 0);
        }

        // Also try documentElement scrolling as fallback
        if (document.documentElement.scrollTop > 0) {
          document.documentElement.scrollTop = 0;
        }

        // Add debug information about what's visible
        const summaryElement = document.querySelector('[data-summary-section]');
        console.log('Summary element found:', !!summaryElement);
      }, 150);

      return () => clearTimeout(scrollTimer);
    }
  }, [currentStep, summary, sessionId, generatedCVResult]);

  // Separate improvements by type with memoization
  const generalImprovements = useMemo(() =>
    improvements.filter(imp => !imp.improvementType || imp.improvementType === 'general'),
    [improvements]
  );

  const jobSpecificImprovements = useMemo(() =>
    improvements.filter(imp => imp.improvementType === 'job_specific'),
    [improvements]
  );

  // Debug: Log current state on every render
  console.log('CVAnalysisClient render:', {
    currentStep,
    summary: !!summary,
    sessionId,
    generatedCVResult: !!generatedCVResult?.documentId,
    approvals: approvals.length
  });

  // Filter improvements based on active tab with memoization
  const getFilteredImprovements = useCallback(() => {
    switch (activeResultsTab) {
      case 'general':
        return generalImprovements;
      case 'jobSpecific':
        return jobSpecificImprovements;
      case 'combined':
      default:
        return improvements;
    }
  }, [activeResultsTab, generalImprovements, jobSpecificImprovements, improvements]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
      setCurrentStep('upload');
    } else {
      setError("Please select a valid PDF file");
    }
  };

  const handleAnalyze = async () => {
    // Validate input based on mode
    if (uploadMode === 'new' && !file) {
      setError('Please select a file to upload');
      return;
    }
    if (uploadMode === 'existing' && !selectedDocumentId) {
      setError('Please select an existing CV');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStep('analyzing');

    try {
      let fileData: { fileName: string; fileType: string; fileSize: number; fileData: string; documentId?: string };

      if (uploadMode === 'existing' && selectedDocumentId) {
        // Use existing document
        const docResult = await getDocumentById(selectedDocumentId);
        if (!docResult.success || !docResult.document) {
          throw new Error('Failed to load selected document');
        }

        // For existing documents, we pass the documentId
        fileData = {
          fileName: docResult.document.original_filename,
          fileType: docResult.document.metadata?.mimeType || 'application/pdf',
          fileSize: docResult.document.metadata?.size || 0,
          fileData: '', // Empty for existing documents
          documentId: selectedDocumentId,
        };
      } else if (file) {
        // Upload new file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        fileData = {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64,
        };
      } else {
        throw new Error('No file or document selected');
      }

      // Upload and trigger the full CV analysis workflow
      const workflowResult = await uploadAndAnalyzeCV({
        ...fileData,
        jobDescriptionId: includeJobDescription ? selectedJobDescriptionId || undefined : undefined,
      });

      if (!workflowResult.success) {
        throw new Error(workflowResult.error || 'Workflow failed');
      }

      setSessionId(workflowResult.sessionId);

      // Debug: Log workflow result
      console.log('Workflow result:', workflowResult);

      // Try to use data from workflow result first (it's already available)
      if (workflowResult.analysis) {
        console.log('Using analysis from workflow result');
        // Handle new structure - get general analysis
        const generalAnalysis = workflowResult.analysis?.general || workflowResult.analysis;
        setAnalysis(generalAnalysis);

        // Combine improvements from general and job-specific
        const allImprovements = [
          ...(workflowResult.improvements?.general || []),
          ...(workflowResult.improvements?.jobSpecific || [])
        ];
        setImprovements(allImprovements);

        // Set scores
        setScores(workflowResult.scores || { overall: 0 });
      } else {
        // Fallback: Fetch the analysis results from database
        console.log('Fetching analysis results from database...');
        const sessionId = workflowResult.sessionId;
        if (!sessionId) {
          throw new Error('Session ID not found in workflow result');
        }
        const analysisResponse = await getAnalysisResults(sessionId);
        console.log('Analysis response:', analysisResponse);

        if (analysisResponse.success && analysisResponse.results?.result) {
          console.log('Setting analysis:', analysisResponse.results.result.analysis);
          const result = analysisResponse.results.result;

          // Handle new structure
          const generalAnalysis = result.analysis?.general || result.analysis;
          setAnalysis(generalAnalysis);

          // Combine improvements
          const allImprovements = [
            ...(result.improvements?.general || []),
            ...(result.improvements?.jobSpecific || [])
          ];
          setImprovements(allImprovements);

          // Set scores
          setScores(result.scores || { overall: 0 });
        } else {
          console.warn('No analysis results found or invalid structure:', analysisResponse);
          throw new Error('Failed to retrieve analysis results');
        }
      }

      // Fetch pending approvals
      const approvalsResponse = await getPendingApprovals(workflowResult.sessionId);
      console.log('Approvals response:', approvalsResponse);

      if (approvalsResponse.success && approvalsResponse.approvals) {
        console.log('Setting approvals:', approvalsResponse.approvals);
        setApprovals(approvalsResponse.approvals);
      } else {
        console.warn('No approvals found or invalid structure:', approvalsResponse);
      }

      setCurrentStep('results');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : "Failed to analyze CV");
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproval = async (approvalId: string, decision: 'approved' | 'rejected', feedback?: string) => {
    // Add to processing set
    setProcessingApprovals(prev => new Set(prev).add(approvalId));

    try {
      await handleApprovalDecision(approvalId, decision, feedback);

      // Refresh approvals list
      if (sessionId) {
        const approvalsResponse = await getPendingApprovals(sessionId);
        if (approvalsResponse.success && approvalsResponse.approvals) {
          setApprovals(approvalsResponse.approvals);
        }
      }
    } catch (err) {
      console.error('Approval error:', err);
      setError(err instanceof Error ? err.message : "Failed to process approval");
    } finally {
      // Remove from processing set
      setProcessingApprovals(prev => {
        const newSet = new Set(prev);
        newSet.delete(approvalId);
        return newSet;
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Information Collection Functions
  const handleStartInformationCollection = async () => {
    if (!sessionId) return;

    try {
      setIsProcessing(true);
      setError(null);

      const questionsResult = await generateCVQuestions(sessionId);

      if (questionsResult.success && questionsResult.questions) {
        setQuestions(questionsResult.questions);
        setCurrentStep('information_collection');
      } else {
        setError(questionsResult.error || 'Failed to generate questions');
      }
    } catch (err) {
      console.error('Information collection error:', err);
      setError(err instanceof Error ? err.message : "Failed to start information collection");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    // Clear any existing skip when user answers
    if (skippedQuestions[questionId]) {
      setSkippedQuestions(prev => {
        const newSkipped = { ...prev };
        delete newSkipped[questionId];
        return newSkipped;
      });
    }
  };

  const handleSkipQuestion = (questionId: string, reason?: string) => {
    setSkippedQuestions(prev => ({
      ...prev,
      [questionId]: reason || 'Skipped by user'
    }));
    setResponses(prev => {
      const newResponses = { ...prev };
      delete newResponses[questionId];
      return newResponses;
    });
  };

  const validateResponses = useCallback(() => {
    const requiredQuestions = questions.filter(q => q.is_required === 'true');
    const missingAnswers = requiredQuestions.filter(q =>
      !responses[q.id] && !skippedQuestions[q.id]
    );

    return missingAnswers.length === 0;
  }, [questions, responses, skippedQuestions]);

  const handleSubmitResponses = async () => {
    if (!sessionId) return;

    // Validate responses first
    const isValid = validateResponses();
    if (!isValid) {
      setShowValidationErrors(true);
      return;
    }

    try {
      setIsSubmittingResponses(true);
      setError(null);
      setShowValidationErrors(false);

      // Prepare responses for submission
      const submissionData = questions.map(question => ({
        questionId: question.id,
        questionCategory: question.category || question.question_category || 'personal',
        questionText: question.text || question.question_text || '',
        answer: responses[question.id] || null,
        isSkipped: !!skippedQuestions[question.id],
        skipReason: skippedQuestions[question.id] || undefined
      }));

      const result = await saveCVResponses(sessionId, submissionData);

      if (result.success) {
        // Now generate the CV using the saved responses
        setIsGeneratingCV(true);
        const cvResult = await generateUpdatedCV(sessionId);

        if (cvResult.success && cvResult.documentId && cvResult.downloadUrl) {
          console.log('CV generation successful, setting result and navigating...');
          console.log('Current states before setting summary:', {
            currentStep,
            summary: !!summary,
            sessionId
          });

          setGeneratedCVResult({
            documentId: cvResult.documentId,
            downloadUrl: cvResult.downloadUrl
          });

          // Load summary data before changing step
          try {
            const summaryResponse = await getApprovalSummary(sessionId);
            console.log('Summary response:', summaryResponse);

            if (summaryResponse.success && summaryResponse.summary) {
              setSummary(summaryResponse.summary);
              console.log('Summary set successfully');
            } else {
              console.warn('Failed to load summary:', summaryResponse.error);
            }
          } catch (err) {
            console.error('Error loading summary:', err);
          }

          // Change step after summary is loaded
          setCurrentStep('summary');
          console.log('Step set to summary');

          // Force scroll to top with a small delay to ensure DOM has updated
          setTimeout(() => {
            console.log('Scrolling to top after CV generation...');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        } else {
          setError(cvResult.error || 'Failed to generate CV');
          // Still move to summary step even if CV generation failed
          setCurrentStep('summary');
        }
      } else {
        setError(result.error || 'Failed to save responses');
      }
    } catch (err) {
      console.error('Submit responses error:', err);
      setError(err instanceof Error ? err.message : "Failed to submit responses");
    } finally {
      setIsSubmittingResponses(false);
      setIsGeneratingCV(false);
    }
  };

  const handleBackToApprovals = () => {
    setCurrentStep('approvals');
    setShowValidationErrors(false);
  };

  const handleViewSummary = async () => {
    if (!sessionId) return;

    try {
      const summaryResponse = await getApprovalSummary(sessionId);

      if (summaryResponse.success && summaryResponse.summary) {
        setSummary(summaryResponse.summary);
        setCurrentStep('summary');
        // Smooth scroll to top of the page to show the summary
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(summaryResponse.error || 'Failed to load summary');
      }
    } catch (err) {
      console.error('Summary error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Card - Only show when on upload step */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Your CV</CardTitle>
            <CardDescription>
              Choose an existing CV or upload a new one to get AI-powered analysis and improvement suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'existing' | 'new')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Use Existing CV</TabsTrigger>
                <TabsTrigger value="new">Upload New CV</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4 mt-4">
                <DocumentSelector
                  documentType="cv"
                  onSelect={setSelectedDocumentId}
                  selectedDocumentId={selectedDocumentId}
                  label="Select Your CV"
                  placeholder="Choose a CV to analyze"
                />
              </TabsContent>

              <TabsContent value="new" className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label
                      htmlFor="cv-upload"
                      className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {file ? file.name : "Click to upload PDF"}
                        </span>
                      </div>
                      <input
                        id="cv-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {file && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm flex-1">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Job Description Selection - Optional */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <BriefcaseIcon className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Job Description (Optional)</h3>
                  <Badge variant="secondary" className="text-xs">
                    Enhanced Analysis
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIncludeJobDescription(!includeJobDescription)}
                  className="text-xs"
                >
                  {includeJobDescription ? 'Remove' : 'Add'}
                </Button>
              </div>

              {includeJobDescription ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add a job description to get tailored improvements and a job-fit score
                  </p>
                  <JobDescriptionSelector
                    onSelect={setSelectedJobDescriptionId}
                    selectedDocumentId={selectedJobDescriptionId}
                    label="Job Description"
                    placeholder="Select a job description for enhanced analysis"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Add a job description for tailored improvements
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIncludeJobDescription(true)}
                  >
                    Add Job Description
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={
                (uploadMode === 'new' && !file) ||
                (uploadMode === 'existing' && !selectedDocumentId) ||
                (includeJobDescription && !selectedJobDescriptionId) ||
                isProcessing
              }
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {includeJobDescription ? 'Analyzing CV with Job Context...' : 'Analyzing CV with AI...'}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {includeJobDescription ? 'Analyze CV + Job Fit' : 'Analyze CV'}
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analyzing State */}
      {currentStep === 'analyzing' && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">
                  {includeJobDescription ? 'Analyzing CV with Job Context' : 'Analyzing Your CV'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {includeJobDescription
                    ? 'Our AI is reviewing your CV against the job requirements and generating tailored improvements...'
                    : 'Our AI is reviewing your CV and generating personalized improvement suggestions...'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {currentStep === 'results' && (
        <>
          {!analysis ? (
            <Card>
              <CardHeader>
                <CardTitle>No Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Analysis completed but no results were found. Please check the console for details.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Analysis Complete
              </CardTitle>
              <CardDescription>
                Here's what we found about your CV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scores - Comparison View */}
              {scores?.jobFit !== undefined ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* CV Quality Score */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">CV Quality Score</p>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{scores.overall}/100</p>
                    </div>
                    <div className="w-20 h-20 mx-auto mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-blue-200 dark:text-blue-800 stroke-current"
                          strokeWidth="8"
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                        />
                        <circle
                          className="text-blue-600 dark:text-blue-400 stroke-current"
                          strokeWidth="8"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 36}`}
                          strokeDashoffset={`${2 * Math.PI * 36 * (1 - scores.overall / 100)}`}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Job Fit Score */}
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Job Fit Score</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-300">{scores.jobFit}/100</p>
                    </div>
                    <div className="w-20 h-20 mx-auto mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-green-200 dark:text-green-800 stroke-current"
                          strokeWidth="8"
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                        />
                        <circle
                          className="text-green-600 dark:text-green-400 stroke-current"
                          strokeWidth="8"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="36"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 36}`}
                          strokeDashoffset={`${2 * Math.PI * 36 * (1 - scores.jobFit / 100)}`}
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Score View */
                <div className="flex items-center gap-4 p-4 bg-muted rounded-md">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Overall Score</p>
                    <p className="text-4xl font-bold">{analysis.overallScore}/100</p>
                  </div>
                  <div className="w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        className="text-muted stroke-current"
                        strokeWidth="10"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                      />
                      <circle
                        className="text-primary stroke-current"
                        strokeWidth="10"
                        strokeLinecap="round"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - analysis.overallScore / 100)}`}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Job Fit Explanation */}
              {scores?.jobFit !== undefined && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <BriefcaseIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium text-green-800 dark:text-green-200">Job Match Analysis</h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your CV has been analyzed against the specific job requirements. The job-fit score indicates how well your CV matches the position's requirements, including keywords, experience alignment, and skills coverage.
                  </p>
                  <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                    💡 Look for job-specific improvements in the suggestions below to optimize your CV for this position.
                  </div>
                </div>
              )}

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm p-3 bg-green-500/10 border border-green-500/20 dark:bg-green-500/20 dark:border-green-500/30 text-green-800 dark:text-green-200 rounded-md">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="text-sm p-3 bg-yellow-500/10 border border-yellow-500/20 dark:bg-yellow-500/20 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-200 rounded-md">
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Key Recommendations</h3>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-sm p-3 bg-blue-500/10 border border-blue-500/20 dark:bg-blue-500/20 dark:border-blue-500/30 text-blue-800 dark:text-blue-200 rounded-md">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Results Interface - Tab System */}
              {jobSpecificImprovements.length > 0 ? (
                <div className="space-y-4">
                  {/* Tab Navigation */}
                  <Tabs value={activeResultsTab} onValueChange={(value) => setActiveResultsTab(value as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="general" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        General ({generalImprovements.length})
                      </TabsTrigger>
                      <TabsTrigger value="jobSpecific" className="flex items-center gap-2">
                        <BriefcaseIcon className="w-4 h-4" />
                        Job-Specific ({jobSpecificImprovements.length})
                      </TabsTrigger>
                      <TabsTrigger value="combined" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Combined ({improvements.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab Content */}
                    <TabsContent value="general" className="space-y-4 mt-4">
                      <div className="text-sm text-muted-foreground">
                        General CV improvements focusing on structure, formatting, and overall presentation.
                      </div>
                      <div className="space-y-3">
                        {generalImprovements.map((improvement, index) => (
                          <Card key={index} className="border-l-4 border-l-blue-500">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{improvement.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">Section: {improvement.section}</p>
                                  <p className="text-sm mt-2">{improvement.description}</p>
                                </div>
                                <Badge className={getPriorityColor(improvement.priority)}>
                                  {improvement.priority}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {generalImprovements.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No general improvements available</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="jobSpecific" className="space-y-4 mt-4">
                      <div className="text-sm text-muted-foreground">
                        Job-specific improvements tailored to the selected job description to maximize your match.
                      </div>
                      <div className="space-y-3">
                        {jobSpecificImprovements.map((improvement, index) => (
                          <Card key={index} className="border-l-4 border-l-green-500">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{improvement.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">Section: {improvement.section}</p>
                                  <p className="text-sm mt-2">{improvement.description}</p>
                                  {improvement.jobContext && (
                                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs text-green-700 dark:text-green-300">
                                      <strong>Job Context:</strong> {improvement.jobContext}
                                    </div>
                                  )}
                                </div>
                                <Badge className={getPriorityColor(improvement.priority)}>
                                  {improvement.priority}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {jobSpecificImprovements.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No job-specific improvements available</p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="combined" className="space-y-4 mt-4">
                      <div className="text-sm text-muted-foreground">
                        All improvements combined, with job-specific suggestions shown first for priority.
                      </div>
                      <div className="space-y-3">
                        {getFilteredImprovements().map((improvement, index) => (
                          <Card key={index} className={`border-l-4 ${
                            improvement.improvementType === 'job_specific'
                              ? 'border-l-green-500'
                              : 'border-l-blue-500'
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm">{improvement.title}</h4>
                                    {improvement.improvementType === 'job_specific' && (
                                      <Badge variant="secondary" className="text-xs">Job-Specific</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">Section: {improvement.section}</p>
                                  <p className="text-sm mt-2">{improvement.description}</p>
                                  {improvement.jobContext && (
                                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs text-green-700 dark:text-green-300">
                                      <strong>Job Context:</strong> {improvement.jobContext}
                                    </div>
                                  )}
                                </div>
                                <Badge className={getPriorityColor(improvement.priority)}>
                                  {improvement.priority}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {getFilteredImprovements().length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No improvements available</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {approvals.length > 0 ? (
                      <Button
                        onClick={() => setCurrentStep('approvals')}
                        className="w-full"
                      >
                        Review {approvals.length} Improvement{approvals.length > 1 ? 's' : ''}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleViewSummary}
                        className="w-full"
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Approval Summary
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* Single View - No Job Context */
                <div className="space-y-4">
                  <div className="space-y-3">
                    {improvements.map((improvement, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{improvement.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">Section: {improvement.section}</p>
                              <p className="text-sm mt-2">{improvement.description}</p>
                            </div>
                            <Badge className={getPriorityColor(improvement.priority)}>
                              {improvement.priority}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {improvements.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No improvements available</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {approvals.length > 0 ? (
                      <Button
                        onClick={() => setCurrentStep('approvals')}
                        className="w-full"
                      >
                        Review {approvals.length} Improvement{approvals.length > 1 ? 's' : ''}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleViewSummary}
                        className="w-full"
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Approval Summary
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </>
      )}

      {/* Approvals Section */}
      {currentStep === 'approvals' && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ThumbsUp className="w-6 h-6 text-primary" />
              Review Improvements
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Review and approve the AI-suggested improvements to personalize your CV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            {approvals.length === 0 ? (
              <Alert className="flex items-center">
                <CheckCircle2 className="h-5 w-5" />
                <AlertDescription className="text-base ml-2">
                  All improvements have been reviewed!
                </AlertDescription>
              </Alert>
            ) : (
              approvals.map((approval) => {
                // Get improvement from proposed_content field (snake_case from database)
                const improvement = (approval.proposed_content || approval) as any;

                // Debug log to see the structure
                console.log('Approval item:', approval);
                console.log('Improvement data:', improvement);
                console.log('proposed_content:', approval.proposed_content);

                // Extract fields with fallbacks
                const title = improvement?.title || 'Improvement suggestion';
                const section = improvement?.section || 'general';
                const priority = improvement?.priority || 'medium';
                const description = improvement?.description || 'No description available';
                const reasoning = improvement?.reasoning || 'No reasoning provided';
                const jobContext = improvement?.jobContext || improvement?.job_context || null;
                const improvementType = improvement?.improvementType || improvement?.improvement_type || null;

                // Check if this approval is being processed
                const isProcessing = processingApprovals.has(approval.id);

                return (
                  <Card key={approval.id} className={`border-2 transition-all duration-200 hover:shadow-md ${isProcessing ? 'opacity-60' : ''} ${
                    improvementType === 'job_specific' ? 'border-l-green-500 border-l-4' : 'border-l-gray-300 border-l-4'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base leading-tight">{title}</CardTitle>
                            {improvementType === 'job_specific' && (
                              <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">Job-Specific</Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            Section: {section}
                          </CardDescription>
                        </div>
                        <Badge className={`${getPriorityColor(priority)} text-xs px-2 py-1`}>
                          {priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Description:</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Reasoning:</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{reasoning}</p>
                      </div>

                      {jobContext && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium mb-1 text-green-700 dark:text-green-300">Job Context:</p>
                          <p className="text-sm text-green-600 dark:text-green-400">{jobContext}</p>
                        </div>
                      )}

                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-md">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Processing your decision...
                          </p>
                        </div>
                      ) : (
                        <div className="flex gap-3 pt-4 border-t">
                          <Button
                            onClick={() => handleApproval(approval.id, 'approved')}
                            className="flex-1"
                            size="sm"
                            disabled={isProcessing}
                          >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleApproval(approval.id, 'rejected', 'User rejected')}
                            className="flex-1"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                          >
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <Button
                  onClick={handleStartInformationCollection}
                  className="flex-1 min-w-0"
                  disabled={isProcessing}
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Answer Questions
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleViewSummary}
                  className="flex-1 min-w-0"
                  variant="outline"
                  size="lg"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Summary
                </Button>
              </div>
              {approvals.length === 0 && (
                <Button
                  onClick={() => setCurrentStep('results')}
                  className="w-full sm:w-auto"
                  variant="ghost"
                  size="lg"
                >
                  <ArrowRightIcon className="mr-2 h-4 w-4 rotate-180" />
                  Back to Results
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Collection Step */}
      {currentStep === 'information_collection' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Tell Us About Yourself
            </CardTitle>
            <CardDescription>
              Answer a few questions to help us generate a personalized CV that reflects your career goals and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating personalized questions...</p>
              </div>
            ) : (
              <>
                {showValidationErrors && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please answer all required questions before proceeding.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <ResponseForm
                      key={`${question.id}-${index}`}
                      question={question}
                      value={responses[question.id]}
                      onChange={(value) => handleResponseChange(question.id, value)}
                      onSkip={(reason) => handleSkipQuestion(question.id, reason)}
                      isSkipped={!!skippedQuestions[question.id]}
                      skipReason={skippedQuestions[question.id]}
                      showValidationErrors={showValidationErrors}
                    />
                  ))}
                </div>

                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBackToApprovals}
                    disabled={isSubmittingResponses}
                  >
                    <ArrowRightIcon className="mr-2 h-4 w-4 rotate-180" />
                    Back to Approvals
                  </Button>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {questions.filter(q => responses[q.id] || skippedQuestions[q.id]).length} of {questions.length} answered
                    </span>
                    <Button
                      onClick={handleSubmitResponses}
                      disabled={isSubmittingResponses || isGeneratingCV || !validateResponses()}
                    >
                      {isGeneratingCV ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating CV...
                        </>
                      ) : isSubmittingResponses ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete & Generate CV
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary View */}
      {currentStep === 'summary' && sessionId && (
        <div className="space-y-6" data-summary-section="true">
          {console.log('Summary section rendering...')}
          {/* Success Header */}
          <div className="text-center py-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex flex-col items-center space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">Your Updated CV is Ready!</h2>
              </div>
              <p className="text-green-700 dark:text-green-300 max-w-md">
                Review your improved CV with AI-suggested enhancements and download the final version.
              </p>
            </div>
          </div>

          {/* Show ApprovalSummary if we have summary data, otherwise show a basic success message */}
          {summary ? (
            <ApprovalSummary
              summary={summary}
              sessionId={sessionId}
              onBack={() => setCurrentStep('information_collection')}
              preGeneratedCV={generatedCVResult}
            />
          ) : (
            <div className="space-y-6">
              <Card>
                <CardContent className="py-6">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading your generated CV...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Debug: Show current step when not in summary */}
      {currentStep !== 'summary' && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 p-2 rounded text-xs">
          Debug: currentStep = {currentStep}
        </div>
      )}
    </div>
  );
}
