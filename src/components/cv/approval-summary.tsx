"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Download } from "lucide-react";

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
  onBack: () => void;
}

export function ApprovalSummary({ summary, onBack }: ApprovalSummaryProps) {
  const approvalPercentage = summary.total > 0
    ? Math.round((summary.approvedCount / summary.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Review Summary</CardTitle>
              <CardDescription className="mt-2">
                Here's a summary of your review decisions
              </CardDescription>
            </div>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Suggestions</CardDescription>
            <CardTitle className="text-4xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Approved
            </CardDescription>
            <CardTitle className="text-4xl text-green-700">{summary.approvedCount}</CardTitle>
            <p className="text-sm text-green-600">{approvalPercentage}% of total</p>
          </CardHeader>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rejected
            </CardDescription>
            <CardTitle className="text-4xl text-red-700">{summary.rejectedCount}</CardTitle>
            <p className="text-sm text-red-600">
              {summary.total > 0 ? Math.round((summary.rejectedCount / summary.total) * 100) : 0}% of total
            </p>
          </CardHeader>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardDescription>
            <CardTitle className="text-4xl text-yellow-700">{summary.pendingCount}</CardTitle>
            <p className="text-sm text-yellow-600">Not yet reviewed</p>
          </CardHeader>
        </Card>
      </div>

      {/* Approved Changes */}
      {summary.approvedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Approved Changes ({summary.approvedCount})
            </CardTitle>
            <CardDescription>
              These improvements will be included in your updated CV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.approved.map((item) => {
              const content = item.content || {};
              return (
                <div key={item.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-green-900">
                      {content.title || 'Improvement'}
                    </h4>
                    <Badge variant="outline" className="bg-white">
                      {item.changeType}
                    </Badge>
                  </div>
                  <p className="text-sm text-green-800">{content.description || 'No description'}</p>
                  {content.section && (
                    <p className="text-xs text-green-600 mt-2">Section: {content.section}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Rejected Changes */}
      {summary.rejectedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rejected Changes ({summary.rejectedCount})
            </CardTitle>
            <CardDescription>
              These suggestions were not applied to your CV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.rejected.map((item) => {
              const content = item.content || {};
              return (
                <div key={item.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-red-900">
                      {content.title || 'Improvement'}
                    </h4>
                    <Badge variant="outline" className="bg-white">
                      {item.changeType}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-800">{content.description || 'No description'}</p>
                  {item.feedback && (
                    <p className="text-xs text-red-600 mt-2 italic">Your feedback: {item.feedback}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending Changes */}
      {summary.pendingCount > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You still have {summary.pendingCount} pending suggestion{summary.pendingCount > 1 ? 's' : ''} to review.
            Go back to the review page to complete your evaluation.
          </AlertDescription>
        </Alert>
      )}

      {/* Next Steps */}
      {summary.approvedCount > 0 && summary.pendingCount === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-800">
              Great! You've reviewed all suggestions. Here's what you can do next:
            </p>
            <div className="space-y-2">
              <Button className="w-full" size="lg" disabled>
                <Download className="mr-2 h-5 w-5" />
                Generate Updated CV (Coming Soon)
              </Button>
              <p className="text-xs text-blue-600 text-center">
                CV generation feature will be available in the next update
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
