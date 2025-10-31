"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { generateUpdatedCV, getDocumentContent } from "@/actions/cv";
import { CVComparison } from "./cv-comparison";
import { createClient } from "@/lib/supabase/client";

interface ApprovalSummary {
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

interface ApprovalSummaryProps {
  summary: ApprovalSummary;
  sessionId: string;
  onBack: () => void;
}

export function ApprovalSummary({ summary, sessionId, onBack }: ApprovalSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [originalCV, setOriginalCV] = useState<string>('');
  const [updatedCV, setUpdatedCV] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate CV and fetch content when component mounts
  useEffect(() => {
    const initializeComparison = async () => {
      if (summary.approvedCount === 0) {
        setError('No approved improvements found');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Generate the updated CV
        console.log('Generating updated CV...');
        const generateResult = await generateUpdatedCV(sessionId);

        if (!generateResult.success || !generateResult.documentId) {
          throw new Error(generateResult.error || 'Failed to generate CV');
        }

        setDownloadUrl(generateResult.downloadUrl);

        // Step 2: Get session to find original document ID
        const supabase = createClient();
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('state')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session?.state?.documentId) {
          throw new Error('Failed to find original document');
        }

        // Step 3: Fetch original CV content
        console.log('Fetching original CV...');
        const originalResult = await getDocumentContent(session.state.documentId);

        if (!originalResult.success || !originalResult.content) {
          throw new Error(originalResult.error || 'Failed to fetch original CV');
        }

        setOriginalCV(originalResult.content);

        // Step 4: Fetch updated CV content
        console.log('Fetching updated CV...');
        const updatedResult = await getDocumentContent(generateResult.documentId);

        if (!updatedResult.success || !updatedResult.content) {
          throw new Error(updatedResult.error || 'Failed to fetch updated CV');
        }

        setUpdatedCV(updatedResult.content);
      } catch (err) {
        console.error('Initialize comparison error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load CV comparison');
      } finally {
        setIsLoading(false);
      }
    };

    initializeComparison();
  }, [sessionId, summary.approvedCount]);

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Generating Your Updated CV</h3>
              <p className="text-sm text-muted-foreground">
                Applying {summary.approvedCount} approved improvement{summary.approvedCount !== 1 ? 's' : ''}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show CV comparison
  return (
    <CVComparison
      originalCV={originalCV}
      updatedCV={updatedCV}
      downloadUrl={downloadUrl}
      approvedCount={summary.approvedCount}
      onBack={onBack}
    />
  );
}
