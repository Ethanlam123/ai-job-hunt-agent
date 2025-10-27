'use server'

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { randomUUID } from "crypto"
import { createClient } from '@/lib/supabase/server'
import { CVAgent } from '@/lib/agents/cv-agent'
import { revalidatePath } from 'next/cache'

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

/**
 * Upload CV and trigger analysis workflow
 */
export async function uploadAndAnalyzeCV(input: {
  fileName: string
  fileType: string
  fileSize: number
  fileData: string // base64
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  let tempFilePath: string | null = null

  try {
    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024
    if (input.fileSize > MAX_SIZE) {
      return { success: false, error: 'File size exceeds 10MB limit' }
    }

    // Validate file type
    if (input.fileType !== 'application/pdf') {
      return { success: false, error: 'Only PDF files are supported' }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(input.fileData, 'base64')

    // Generate unique file path
    const fileExt = input.fileName.split('.').pop()
    const storagePath = `${user.id}/${Date.now()}-${randomUUID()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: input.fileType,
        upsert: false,
      })

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Parse PDF content
    let parsedContent = null
    if (input.fileType === 'application/pdf') {
      const tempFileName = `cv-${randomUUID()}.pdf`
      tempFilePath = join(tmpdir(), tempFileName)
      await writeFile(tempFilePath, buffer)

      const loader = new PDFLoader(tempFilePath)
      const docs = await loader.load()

      parsedContent = {
        pageCount: docs.length,
        fullText: docs.map(doc => doc.pageContent).join('\n\n'),
        pages: docs.map((doc, index) => ({
          pageNumber: index + 1,
          content: doc.pageContent,
        })),
        extractedAt: new Date().toISOString(),
      }
    }

    // Create document record in database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        document_type: 'cv',
        original_filename: input.fileName,
        file_path: uploadData.path,
        file_format: fileExt,
        parsed_content: parsedContent,
        metadata: {
          size: input.fileSize,
          mimeType: input.fileType,
          uploadedAt: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([storagePath])
      return { success: false, error: `Failed to create document record: ${dbError.message}` }
    }

    // Now trigger the workflow with the documentId
    return await triggerCVAnalysisWorkflow(document.id)
  } catch (error: any) {
    console.error('Upload and analyze error:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload and analyze CV',
    }
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to clean up temp file:', cleanupError)
      }
    }
  }
}

/**
 * Trigger CV analysis workflow using CV Agent
 */
export async function triggerCVAnalysisWorkflow(documentId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Create or get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        current_stage: 'cv_analysis',
        state: { documentId },
      })
      .select()
      .single()

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`)
    }

    // Initialize CV Agent
    const cvAgent = new CVAgent(supabase)

    // Run analysis workflow
    const result = await cvAgent.analyzeCV(documentId, session.id, user.id)

    // Revalidate paths
    revalidatePath('/cv-analysis')
    revalidatePath(`/workflow/${session.id}`)

    return {
      success: true,
      sessionId: session.id,
      analysis: result.analysis,
      improvements: result.improvements,
      error: result.error,
    }
  } catch (error: any) {
    console.error('CV Analysis Workflow Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to analyze CV',
    }
  }
}

/**
 * Get CV analysis results for a session
 */
export async function getAnalysisResults(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', results: null }
  }

  try {
    const cvAgent = new CVAgent(supabase)
    const results = await cvAgent.getAnalysisResults(sessionId, user.id)

    return {
      success: true,
      results,
      error: null,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      results: null,
    }
  }
}

/**
 * Get pending approvals for improvements
 */
export async function getPendingApprovals(sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', approvals: null }
  }

  try {
    const cvAgent = new CVAgent(supabase)
    const approvals = await cvAgent.getPendingApprovals(sessionId, user.id)

    return {
      success: true,
      approvals,
      error: null,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      approvals: null,
    }
  }
}

/**
 * Handle approval decision (approve/reject improvement)
 */
export async function handleApprovalDecision(
  approvalId: string,
  decision: 'approved' | 'rejected',
  feedback?: string
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const cvAgent = new CVAgent(supabase)
    const result = await cvAgent.handleApproval(
      approvalId,
      decision,
      feedback || null,
      user.id
    )

    revalidatePath('/cv-analysis')

    return {
      success: true,
      approval: result,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}
