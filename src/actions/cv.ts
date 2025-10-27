'use server'

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

interface AnalyzeCVInput {
  fileName: string;
  fileData: string; // base64 encoded
}

interface AnalyzeCVOutput {
  success: boolean;
  data?: {
    pageCount: number;
    preview: string;
    fullText: string;
    insights?: string;
  };
  error?: string;
}

export async function analyzeCVAction(input: AnalyzeCVInput): Promise<AnalyzeCVOutput> {
  let tempFilePath: string | null = null;

  try {
    const { fileName, fileData } = input;

    // Validate input
    if (!fileName || !fileData) {
      return {
        success: false,
        error: "Missing file name or file data",
      };
    }

    // Validate PDF extension
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return {
        success: false,
        error: "Only PDF files are supported",
      };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, "base64");

    // Create temporary file
    const tempFileName = `cv-${randomUUID()}.pdf`;
    tempFilePath = join(tmpdir(), tempFileName);

    // Write buffer to temporary file
    await writeFile(tempFilePath, buffer);

    // Load PDF using LangChain PDFLoader
    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();

    // Extract text from all pages
    const fullText = docs.map(doc => doc.pageContent).join("\n\n");
    const preview = fullText.slice(0, 500);
    const pageCount = docs.length;

    // Basic insights (can be enhanced with LLM later)
    const insights = generateBasicInsights(fullText, pageCount);

    return {
      success: true,
      data: {
        pageCount,
        preview,
        fullText,
        insights,
      },
    };
  } catch (error) {
    console.error("CV Analysis Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze CV",
    };
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.error("Failed to clean up temp file:", cleanupError);
      }
    }
  }
}

/**
 * Generate basic insights from CV text
 * This is a simple implementation - can be enhanced with LLM analysis
 */
function generateBasicInsights(text: string, pageCount: number): string {
  const insights: string[] = [];

  // Page count analysis
  if (pageCount === 1) {
    insights.push("✓ Good: Your CV is concise at 1 page");
  } else if (pageCount === 2) {
    insights.push("✓ Good: Your CV is 2 pages, which is acceptable for experienced professionals");
  } else if (pageCount > 2) {
    insights.push("⚠ Consider: Your CV is " + pageCount + " pages. Consider condensing to 1-2 pages");
  }

  // Check for common sections
  const sections = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i.test(text),
    phone: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text),
    experience: /experience|employment|work history/i.test(text),
    education: /education|degree|university|college/i.test(text),
    skills: /skills|technologies|competencies/i.test(text),
  };

  if (sections.email) insights.push("✓ Contact email found");
  else insights.push("⚠ Missing: Email address not detected");

  if (sections.phone) insights.push("✓ Phone number found");

  if (sections.experience) insights.push("✓ Work experience section detected");
  else insights.push("⚠ Missing: Work experience section not clearly identified");

  if (sections.education) insights.push("✓ Education section detected");
  else insights.push("⚠ Missing: Education section not clearly identified");

  if (sections.skills) insights.push("✓ Skills section detected");
  else insights.push("⚠ Missing: Skills section not clearly identified");

  // Word count
  const wordCount = text.split(/\s+/).length;
  insights.push(`\nWord count: ${wordCount} words`);

  return insights.join("\n");
}
