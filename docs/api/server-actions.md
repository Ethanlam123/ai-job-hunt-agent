# Server Actions API Documentation

This document outlines all Server Actions available in the AI Job Hunt Agent application. Server Actions are used instead of traditional REST API routes, providing a type-safe approach to data mutations and server-side operations.

## Overview

Server Actions in this application:
- Use the `'use server'` directive
- Handle file uploads, form submissions, and AI agent orchestration
- Integrate with Supabase for data persistence
- Support real-time task tracking for long-running operations
- Enforce Row Level Security (RLS) through Supabase authentication

## Authentication

All Server Actions require user authentication through Supabase Auth:
```typescript
const supabase = await createClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  throw new Error('Unauthorized')
}
```

## Document Management

### `uploadDocument`
**Location**: `src/actions/documents.ts`

Uploads and parses PDF, DOCX, or TXT documents.

**Input**:
```typescript
interface UploadDocumentInput {
  file: File
  sessionId?: string
  documentType: 'cv' | 'jd' | 'cover_letter'
}
```

**Output**:
```typescript
interface UploadDocumentOutput {
  success: boolean
  data?: {
    id: string
    originalFilename: string
    fileFormat: string
    parsedContent: ParsedContent
    preview: string
  }
  error?: string
}
```

**Features**:
- Automatic file parsing using LangChain document loaders
- Content extraction and metadata generation
- Supabase Storage integration
- User-scoped file access via RLS

### `getDocuments`
**Location**: `src/actions/documents.ts`

Retrieves user's uploaded documents.

**Input**:
```typescript
interface GetDocumentsInput {
  documentType?: 'cv' | 'jd' | 'cover_letter'
  limit?: number
  offset?: number
}
```

**Output**:
```typescript
interface GetDocumentsOutput {
  success: boolean
  data?: UploadedDocument[]
  error?: string
}
```

### `deleteDocument`
**Location**: `src/actions/documents.ts`

Deletes a document and associated data.

**Input**:
```typescript
interface DeleteDocumentInput {
  documentId: string
}
```

**Output**:
```typescript
interface DeleteDocumentOutput {
  success: boolean
  error?: string
}
```

## CV Analysis

### `triggerCVAnalysis`
**Location**: `src/actions/cv.ts`

Initiates comprehensive CV analysis using AI agents.

**Input**:
```typescript
interface TriggerCVAnalysisInput {
  documentId?: string
  sessionId: string
  file?: File // Alternative to documentId for new uploads
}
```

**Output**:
```typescript
interface TriggerCVAnalysisOutput {
  success: boolean
  data?: {
    taskId: string
    sessionState: SessionState
  }
  error?: string
}
```

**Process**:
1. Document validation and parsing
2. AI agent analysis using LangGraph.js
3. Improvement suggestions generation
4. Task tracking for real-time updates
5. Results storage with user approval workflow

### `getCVAnalysis`
**Location**: `src/actions/cv.ts`

Retrieves CV analysis results and status.

**Input**:
```typescript
interface GetCVAnalysisInput {
  sessionId: string
}
```

**Output**:
```typescript
interface GetCVAnalysisOutput {
  success: boolean
  data?: {
    analysis: CVAnalysisResult
    improvements: CVImprovement[]
    status: 'processing' | 'completed' | 'failed'
    approvalStatus: 'pending' | 'approved' | 'rejected'
  }
  error?: string
}
```

### `approveCVImprovements`
**Location**: `src/actions/cv.ts`

Approves or rejects AI-suggested CV improvements.

**Input**:
```typescript
interface ApproveCVImprovementsInput {
  sessionId: string
  improvements: CVImprovement[]
  approved: boolean
}
```

**Output**:
```typescript
interface ApproveCVImprovementsOutput {
  success: boolean
  data?: {
    improvedCV: string
    appliedImprovements: CVImprovement[]
  }
  error?: string
}
```

## Cover Letter Generation

### `generateCoverLetter`
**Location**: `src/actions/cover-letter.ts`

Generates personalized cover letters from CV and job description.

**Input**:
```typescript
interface GenerateCoverLetterInput {
  cvDocumentId?: string
  jobDescriptionText: string
  sessionId: string
  cvFile?: File // Alternative to cvDocumentId
}
```

**Output**:
```typescript
interface GenerateCoverLetterOutput {
  success: boolean
  data?: {
    taskId: string
    coverLetterId?: string
  }
  error?: string
}
```

**Features**:
- AI-powered personalization based on CV and JD
- Multiple tone options (professional, enthusiastic, etc.)
- Industry-specific customization
- Real-time generation tracking

### `getCoverLetter`
**Location**: `src/actions/cover-letter.ts`

Retrieves generated cover letter.

**Input**:
```typescript
interface GetCoverLetterInput {
  sessionId: string
}
```

**Output**:
```typescript
interface GetCoverLetterOutput {
  success: boolean
  data?: {
    content: string
    metadata: CoverLetterMetadata
    status: 'processing' | 'completed' | 'failed'
  }
  error?: string
}
```

## Interview Preparation

### `startInterviewPrep`
**Location**: `src/actions/interview.ts`

Starts interview preparation session.

**Input**:
```typescript
interface StartInterviewPrepInput {
  cvDocumentId?: string
  jobDescriptionText: string
  sessionId: string
  cvFile?: File
}
```

**Output**:
```typescript
interface StartInterviewPrepOutput {
  success: boolean
  data?: {
    taskId: string
    sessionId: string
  }
  error?: string
}
```

**Process**:
1. CV and job analysis
2. Interview question generation
3. Difficulty level assessment
4. Category-based question organization

### `getInterviewQuestions`
**Location**: `src/actions/interview.ts`

Retrieves generated interview questions.

**Input**:
```typescript
interface GetInterviewQuestionsInput {
  sessionId: string
}
```

**Output**:
```typescript
interface GetInterviewQuestionsOutput {
  success: boolean
  data?: {
    questions: InterviewQuestion[]
    categories: string[]
    difficulty: 'easy' | 'medium' | 'hard'
    status: 'processing' | 'completed' | 'failed'
  }
  error?: string
}
```

### `submitInterviewAnswer`
**Location**: `src/actions/interview.ts`

Submits answer for evaluation.

**Input**:
```typescript
interface SubmitInterviewAnswerInput {
  sessionId: string
  questionId: string
  answer: string
}
```

**Output**:
```typescript
interface SubmitInterviewAnswerOutput {
  success: boolean
  data?: {
    feedback: InterviewFeedback
    score: number
    suggestions: string[]
  }
  error?: string
}
```

## Skill Gap Analysis

### `analyzeSkillGap`
**Location**: `src/actions/skill-gap.ts`

Performs comprehensive skill gap analysis.

**Input**:
```typescript
interface AnalyzeSkillGapInput {
  cvDocumentId?: string
  jobDescriptionText: string
  sessionId: string
  cvFile?: File
}
```

**Output**:
```typescript
interface AnalyzeSkillGapOutput {
  success: boolean
  data?: {
    taskId: string
    analysisId?: string
  }
  error?: string
}
```

**Features**:
- AI-powered skill extraction and matching
- Timeline organization (short/medium/long term)
- Progress tracking capabilities
- Learning resource suggestions

### `getSkillGapAnalysis`
**Location**: `src/actions/skill-gap.ts`

Retrieves skill gap analysis results.

**Input**:
```typescript
interface GetSkillGapAnalysisInput {
  sessionId: string
}
```

**Output**:
```typescript
interface GetSkillGapAnalysisOutput {
  success: boolean
  data?: {
    analysis: SkillGapAnalysis
    missingSkills: MissingSkill[]
    timeline: SkillTimeline
    status: 'processing' | 'completed' | 'failed'
  }
  error?: string
}
```

### `updateSkillProgress`
**Location**: `src/actions/skill-gap.ts`

Updates skill learning progress.

**Input**:
```typescript
interface UpdateSkillProgressInput {
  skillId: string
  status: 'pending' | 'in_progress' | 'completed' | 'not_interested'
  notes?: string
}
```

**Output**:
```typescript
interface UpdateSkillProgressOutput {
  success: boolean
  data?: {
    updatedSkill: SkillProgress
  }
  error?: string
}
```

## Task Management

### `getTaskStatus`
**Location**: `src/lib/services/task-service.ts`

Checks status of background tasks.

**Input**:
```typescript
interface GetTaskStatusInput {
  taskId: string
}
```

**Output**:
```typescript
interface GetTaskStatusOutput {
  success: boolean
  data?: {
    task: Task
    progress?: number
    estimatedTime?: number
  }
  error?: string
}
```

### `cancelTask`
**Location**: `src/lib/services/task-service.ts`

Cancels running background task.

**Input**:
```typescript
interface CancelTaskInput {
  taskId: string
}
```

**Output**:
```typescript
interface CancelTaskOutput {
  success: boolean
  data?: {
    cancelledTask: Task
  }
  error?: string
}
```

## Session Management

### `createSession`
**Location**: `src/lib/services/session-service.ts`

Creates new user session.

**Input**:
```typescript
interface CreateSessionInput {
  userId: string
  initialStage?: SessionStage
}
```

**Output**:
```typescript
interface CreateSessionOutput {
  success: boolean
  data?: {
    session: Session
  }
  error?: string
}
```

### `updateSession`
**Location**: `src/lib/services/session-service.ts`

Updates session state and stage.

**Input**:
```typescript
interface UpdateSessionInput {
  sessionId: string
  stage?: SessionStage
  state?: Record<string, any>
}
```

**Output**:
```typescript
interface UpdateSessionOutput {
  success: boolean
  data?: {
    session: Session
  }
  error?: string
}
```

## Error Handling

All Server Actions follow consistent error handling patterns:

```typescript
try {
  // Operation logic
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  }
}
```

## Rate Limiting

Server Actions implement PostgreSQL-based rate limiting:

```typescript
const { success, remaining, reset } = await checkRateLimit(
  user.id,        // User identifier
  10,             // Max requests
  60              // Window in seconds
)

if (!success) {
  return { success: false, error: 'Rate limit exceeded' }
}
```

## Real-time Updates

Long-running operations support real-time updates through:

1. **Task Tracking**: PostgreSQL task records with status updates
2. **Server-Sent Events**: Optional SSE for live progress updates
3. **Polling**: Client-side polling for task status

## Usage Examples

### Frontend Component Integration

```typescript
'use client'

import { analyzeCVAction } from '@/actions/cv'
import { useState } from 'react'

export function CVAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async (file: File) => {
    setIsAnalyzing(true)

    try {
      const result = await analyzeCVAction({
        file,
        sessionId: 'session-123'
      })

      if (result.success) {
        console.log('Analysis started:', result.data?.taskId)
      } else {
        console.error('Analysis failed:', result.error)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <button onClick={() => handleAnalyze(file)}>
      {isAnalyzing ? 'Analyzing...' : 'Analyze CV'}
    </button>
  )
}
```

### Server-Side Usage

```typescript
import { getDocuments } from '@/actions/documents'

export async function DocumentsPage() {
  const documents = await getDocuments({ documentType: 'cv' })

  return (
    <div>
      {documents.data?.map(doc => (
        <div key={doc.id}>{doc.originalFilename}</div>
      ))}
    </div>
  )
}
```

## Security Considerations

1. **Authentication**: All actions verify user identity
2. **Authorization**: RLS policies enforce data access
3. **Input Validation**: File type and size restrictions
4. **Rate Limiting**: Prevent abuse and resource exhaustion
5. **Error Handling**: Secure error messages without information leakage

## Best Practices

1. **Type Safety**: Use TypeScript interfaces for all inputs/outputs
2. **Error Boundaries**: Implement proper error handling in components
3. **Loading States**: Provide feedback for long-running operations
4. **Caching**: Cache frequently accessed data when appropriate
5. **Validation**: Validate inputs on both client and server side