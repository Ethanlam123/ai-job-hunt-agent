"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { analyzeCVAction } from "@/actions/cv";

interface AnalysisResult {
  success: boolean;
  data?: {
    pageCount: number;
    preview: string;
    fullText: string;
    insights?: string;
  };
  error?: string;
}

export function CVAnalysisClient() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert("Please select a valid PDF file");
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      // Convert file to base64 for server action
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      const analysisResult = await analyzeCVAction({
        fileName: file.name,
        fileData: base64,
      });

      setResult(analysisResult);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze CV",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Your CV</CardTitle>
          <CardDescription>
            Upload a PDF file of your CV to get started with the analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <Button
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing CV...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Analyze CV
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Analysis Complete
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Analysis Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success && result.data ? (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                  <div>
                    <p className="text-sm font-medium">Page Count</p>
                    <p className="text-2xl font-bold">{result.data.pageCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Characters Extracted</p>
                    <p className="text-2xl font-bold">
                      {result.data.fullText.length.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Preview (First 500 characters)</h3>
                  <div className="p-4 bg-muted rounded-md">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {result.data.preview}
                    </pre>
                  </div>
                </div>

                {result.data.insights && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">AI Insights</h3>
                    <Alert>
                      <AlertDescription className="whitespace-pre-wrap">
                        {result.data.insights}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
