import { Metadata } from "next";
import { CVAnalysisClient } from "@/components/cv/cv-analysis-client";

export const metadata: Metadata = {
  title: "CV Analysis | AI Job Hunt Agent",
  description: "Analyze and improve your CV with AI-powered insights",
};

export default function CVAnalysisPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">CV Analysis</h1>
          <p className="text-muted-foreground">
            Upload your CV to receive AI-powered insights and improvement suggestions
          </p>
        </div>

        <CVAnalysisClient />
      </div>
    </div>
  );
}
