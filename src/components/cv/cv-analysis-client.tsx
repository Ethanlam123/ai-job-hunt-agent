"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, ThumbsUp, ThumbsDown, Sparkles, BarChart3 } from "lucide-react";
import {
  uploadAndAnalyzeCV,
  getAnalysisResults,
  getPendingApprovals,
  handleApprovalDecision,
  getApprovalSummary
} from "@/actions/cv";
import { getDocumentById } from "@/actions/documents";
import { DocumentSelector } from "@/components/documents/document-selector";
import { ApprovalSummary } from "./approval-summary";

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

type WorkflowStep = 'upload' | 'analyzing' | 'results' | 'approvals' | 'summary';

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
  const [processingApprovals, setProcessingApprovals] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ApprovalSummaryData | null>(null);

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
      const workflowResult = await uploadAndAnalyzeCV(fileData);

      if (!workflowResult.success) {
        throw new Error(workflowResult.error || 'Workflow failed');
      }

      setSessionId(workflowResult.sessionId);

      // Debug: Log workflow result
      console.log('Workflow result:', workflowResult);

      // Try to use data from workflow result first (it's already available)
      if (workflowResult.analysis) {
        console.log('Using analysis from workflow result');
        setAnalysis(workflowResult.analysis);
        setImprovements(workflowResult.improvements || []);
      } else {
        // Fallback: Fetch the analysis results from database
        console.log('Fetching analysis results from database...');
        const analysisResponse = await getAnalysisResults(workflowResult.sessionId);
        console.log('Analysis response:', analysisResponse);

        if (analysisResponse.success && analysisResponse.results?.result) {
          console.log('Setting analysis:', analysisResponse.results.result.analysis);
          setAnalysis(analysisResponse.results.result.analysis);
          setImprovements(analysisResponse.results.result.improvements || []);
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

  const handleViewSummary = async () => {
    if (!sessionId) return;

    try {
      const summaryResponse = await getApprovalSummary(sessionId);

      if (summaryResponse.success && summaryResponse.summary) {
        setSummary(summaryResponse.summary);
        setCurrentStep('summary');
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

            <Button
              onClick={handleAnalyze}
              disabled={(uploadMode === 'new' && !file) || (uploadMode === 'existing' && !selectedDocumentId) || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing CV with AI...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze CV
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
                <h3 className="text-lg font-semibold">Analyzing Your CV</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI is reviewing your CV and generating personalized improvement suggestions...
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
              {/* Overall Score */}
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

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm p-3 bg-green-50 border border-green-200 rounded-md">
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
                      <li key={index} className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-md">
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
                      <li key={index} className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-md">
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
            </CardContent>
          </Card>
          )}
        </>
      )}

      {/* Approvals Section */}
      {currentStep === 'approvals' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Improvements</CardTitle>
            <CardDescription>
              Review and approve the AI-suggested improvements to your CV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvals.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
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

                // Check if this approval is being processed
                const isProcessing = processingApprovals.has(approval.id);

                return (
                  <Card key={approval.id} className={`border-2 transition-opacity ${isProcessing ? 'opacity-60' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{title}</CardTitle>
                          <CardDescription className="mt-1">
                            Section: {section}
                          </CardDescription>
                        </div>
                        <Badge className={getPriorityColor(priority)}>
                          {priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Description:</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Reasoning:</p>
                        <p className="text-sm text-muted-foreground">{reasoning}</p>
                      </div>

                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-md">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Processing your decision...
                          </p>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleApproval(approval.id, 'approved')}
                            className="flex-1"
                            variant="default"
                            disabled={isProcessing}
                          >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleApproval(approval.id, 'rejected', 'User rejected')}
                            className="flex-1"
                            variant="outline"
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

            <div className="flex gap-2 mt-6">
              {approvals.length === 0 ? (
                <>
                  <Button
                    onClick={() => setCurrentStep('results')}
                    className="flex-1"
                    variant="outline"
                  >
                    Back to Results
                  </Button>
                  <Button
                    onClick={handleViewSummary}
                    className="flex-1"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Summary
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleViewSummary}
                  className="w-full"
                  variant="outline"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Summary (Review in Progress)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary View */}
      {currentStep === 'summary' && summary && sessionId && (
        <ApprovalSummary
          summary={summary}
          sessionId={sessionId}
          onBack={() => setCurrentStep('results')}
        />
      )}
    </div>
  );
}
