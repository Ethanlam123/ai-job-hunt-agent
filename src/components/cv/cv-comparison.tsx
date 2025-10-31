"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText } from "lucide-react";

interface CVComparisonProps {
  originalCV: string;
  updatedCV: string;
  downloadUrl: string | null;
  approvedCount: number;
  onBack: () => void;
}

export function CVComparison({
  originalCV,
  updatedCV,
  downloadUrl,
  approvedCount,
  onBack
}: CVComparisonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Your Updated CV
              </CardTitle>
              <CardDescription className="mt-2">
                {approvedCount} improvement{approvedCount !== 1 ? 's' : ''} applied to your CV
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {downloadUrl && (
                <Button onClick={() => window.open(downloadUrl, '_blank')}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original CV */}
        <Card className="border-gray-300">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Original CV</span>
              <Badge variant="outline" className="bg-white">Before</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-50 p-4 rounded-md border max-h-[600px] overflow-y-auto">
                {originalCV}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Updated CV */}
        <Card className="border-green-300 bg-green-50/30">
          <CardHeader className="bg-green-100">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Updated CV</span>
              <Badge className="bg-green-600">After</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-xs font-mono bg-white p-4 rounded-md border border-green-200 max-h-[600px] overflow-y-auto">
                {updatedCV}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Section */}
      {downloadUrl && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Your updated CV is ready!</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Download your improved CV as a markdown file.
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <Download className="mr-2 h-5 w-5" />
                Download CV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
