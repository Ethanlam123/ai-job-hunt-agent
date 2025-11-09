# Developer Guide

This guide provides comprehensive information for developers working on the AI Job Hunt Agent project, including development patterns, coding standards, and architectural decisions.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Architecture](#project-architecture)
- [Coding Standards](#coding-standards)
- [Development Patterns](#development-patterns)
- [Database Development](#database-development)
- [AI Agent Development](#ai-agent-development)
- [Testing Guidelines](#testing-guidelines)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)

## Development Environment Setup

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: Latest version
- **VS Code**: Recommended IDE with extensions
- **PostgreSQL Client**: For database operations (optional)

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-sqlite",
    "cweijan.vscode-redis-client"
  ]
}
```

### Environment Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-job-hunt-agent
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your local development credentials
   ```

3. **Database Setup**
   ```bash
   # Use automated setup (recommended)
   ./scripts/setup-database.sh

   # Or manual setup
   npm run db:push && npm run db:apply-rls
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

## Project Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 + React 19 | Full-stack framework |
| **Styling** | Tailwind CSS + shadcn/ui | Component styling |
| **Backend** | Next.js Server Actions | API endpoints |
| **Database** | Supabase + PostgreSQL | Data persistence |
| **AI/ML** | LangChain | LLM integration |
| **Vector DB** | pgvector | Embeddings storage |

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected routes
│   ├── api/               # API endpoints (if needed)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Authentication components
│   ├── cv-analysis/      # CV analysis components
│   ├── skill-gap/        # Skill gap components
│   ├── cover-letter/     # Cover letter components
│   ├── interview/        # Interview components
│   ├── documents/        # Document management
│   └── shared/           # Shared components
├── actions/              # Server Actions ('use server')
├── lib/                  # Library code
│   ├── agents/          # AI agents
│   ├── services/        # Business services
│   ├── prompts/         # LLM prompts
│   ├── supabase/        # Supabase utilities
│   ├── utils/           # Helper functions
│   └── types/           # TypeScript definitions
└── middleware.ts         # Auth middleware
```

### Component Architecture

#### Server Components (Default)
- **Purpose**: Data fetching, authentication, server-side logic
- **Characteristics**: No client-side interactivity
- **Usage**: Most pages and data-heavy components

```typescript
// Example: Server Component
export default async function CVAnalysisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const documents = await getDocuments(user.id)

  return (
    <div>
      <h1>CV Analysis</h1>
      <DocumentList documents={documents} />
    </div>
  )
}
```

#### Client Components (Interactive)
- **Purpose**: User interactions, state management, browser APIs
- **Characteristics**: Uses React hooks and event handlers
- **Usage**: Forms, modals, interactive elements

```typescript
// Example: Client Component
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function DocumentUploader() {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      await uploadDocument(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Button onClick={() => fileInput.click()}>
      {uploading ? 'Uploading...' : 'Upload Document'}
    </Button>
  )
}
```

## Coding Standards

### TypeScript Configuration

**Strict Mode Enabled**: All TypeScript features are enabled for maximum type safety.

**Key tsconfig.json rules**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Code Style

#### 1. File Naming

- **Components**: PascalCase (`CVAnalysisClient.tsx`)
- **Utilities**: camelCase (`document-parser.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)
- **Types**: PascalCase with descriptive names (`UploadedDocument.ts`)

#### 2. Import Organization

```typescript
// 1. React and Next.js imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

// 3. Internal imports (absolute paths)
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { DocumentType } from '@/lib/types'

// 4. Relative imports (same directory)
import { DocumentPreview } from './document-preview'
```

#### 3. Component Structure

```typescript
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// 2. Type definitions
interface DocumentUploaderProps {
  onUpload: (document: UploadedDocument) => void
  acceptedTypes?: string[]
}

// 3. Component implementation
export function DocumentUploader({
  onUpload,
  acceptedTypes = ['.pdf', '.docx']
}: DocumentUploaderProps) {
  // 4. Hooks
  const [uploading, setUploading] = useState(false)

  // 5. Event handlers
  const handleFileSelect = async (file: File) => {
    // Implementation
  }

  // 6. Effects
  useEffect(() => {
    // Side effects
  }, [])

  // 7. Helper functions
  const validateFile = (file: File): boolean => {
    // Validation logic
    return true
  }

  // 8. Render
  return (
    <div className="document-uploader">
      {/* JSX content */}
    </div>
  )
}
```

#### 4. Server Actions Pattern

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UploadDocumentInput {
  file: File
  userId: string
}

interface UploadDocumentResult {
  success: boolean
  data?: UploadedDocument
  error?: string
}

export async function uploadDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  try {
    // 1. Authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Validation
    if (!input.file || !input.userId) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Business logic
    const document = await processDocumentUpload(input)

    // 4. Cache invalidation
    revalidatePath('/documents')

    // 5. Return result
    return { success: true, data: document }

  } catch (error) {
    console.error('Document upload failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

## Development Patterns

### 1. Error Handling Pattern

```typescript
// Server-side error handling
try {
  const result = await someOperation()
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  }
}

// Client-side error handling
const [error, setError] = useState<string | null>(null)

const handleSubmit = async () => {
  try {
    setError(null)
    const result = await someServerAction()
    if (!result.success) {
      setError(result.error || 'Operation failed')
    }
  } catch (error) {
    setError('An unexpected error occurred')
  }
}
```

### 2. Loading State Pattern

```typescript
// Component loading state
const [loading, setLoading] = useState(false)
const [data, setData] = useState<DataType | null>(null)

const loadData = async () => {
  setLoading(true)
  try {
    const result = await fetchData()
    setData(result)
  } finally {
    setLoading(false)
  }
}

// UI with loading state
return (
  <div>
    {loading ? (
      <Skeleton className="h-4 w-full" />
    ) : data ? (
      <DataComponent data={data} />
    ) : (
      <p>No data available</p>
    )}
  </div>
)
```

### 3. Form Handling Pattern

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['cv', 'jd', 'cover_letter']),
  description: z.string().optional()
})

type DocumentFormData = z.infer<typeof documentSchema>

export function DocumentForm() {
  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      type: 'cv',
      description: ''
    }
  })

  const onSubmit = async (data: DocumentFormData) => {
    try {
      const result = await createDocumentAction(data)
      if (result.success) {
        toast.success('Document created successfully')
        form.reset()
      } else {
        toast.error(result.error || 'Failed to create document')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

### 4. Data Fetching Pattern

```typescript
// Server-side data fetching
export async function getDocuments(userId: string): Promise<Document[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch documents:', error)
    throw new Error('Failed to fetch documents')
  }

  return data || []
}

// Client-side data fetching with caching
export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true)
        const result = await getDocumentsAction()
        if (result.success) {
          setDocuments(result.data || [])
        } else {
          setError(result.error || 'Failed to load documents')
        }
      } catch (error) {
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [])

  return { documents, loading, error }
}
```

## Database Development

### Schema Management

#### 1. Schema Definitions (Drizzle ORM)

```typescript
// src/lib/db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  documentType: varchar('document_type', { length: 50 }),
  originalFilename: varchar('original_filename', { length: 255 }),
  filePath: varchar('file_path', { length: 500 }),
  fileFormat: varchar('file_format', { length: 10 }),
  parsedContent: jsonb('parsed_content'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

#### 2. Database Migrations

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Push schema (development only)
npm run db:push
```

#### 3. Database Queries

```typescript
// Type-safe database access
import { db } from '@/lib/db'
import { documents, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function getUserDocuments(userId: string) {
  return await db
    .select({
      id: documents.id,
      filename: documents.originalFilename,
      type: documents.documentType,
      createdAt: documents.createdAt
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt))
}
```

### Row Level Security (RLS)

#### RLS Policy Example

```sql
-- Documents table RLS policy
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);
```

#### Testing RLS Policies

```typescript
// Test RLS in development
async function testRLSPolicies() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypass RLS for testing
  )

  // Test user-specific access
  const userDocs = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', 'test-user-id')

  console.log('User documents:', userDocs.data)
}
```

## AI Agent Development

### Agent Architecture

#### 1. Base Agent Class

```typescript
// src/lib/agents/base-agent.ts
import { ChatOpenAI } from '@langchain/openai'
import { SupabaseClient } from '@supabase/supabase-js'

export abstract class BaseAgent {
  protected supabase: SupabaseClient
  protected llm: ChatOpenAI

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.llm = new ChatOpenAI({
      model: 'openai/gpt-5-nano',
      temperature: 0.7,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      },
    })
  }

  abstract execute(input: any): Promise<any>
  protected abstract validateInput(input: any): boolean
}
```

#### 2. Specific Agent Implementation

```typescript
// src/lib/agents/cv-agent.ts
import { BaseAgent } from './base-agent'
import { CVPrompts } from '@/lib/prompts/cv-prompts'

export class CVAgent extends BaseAgent {
  async analyzeCV(documentId: string, sessionId: string, userId: string) {
    // 1. Validate input
    this.validateInput({ documentId, sessionId, userId })

    // 2. Fetch and parse document
    const document = await this.getDocument(documentId, userId)
    const parsedContent = await this.parseDocument(document)

    // 3. Generate analysis
    const analysis = await this.generateAnalysis(parsedContent)

    // 4. Generate improvements
    const improvements = await this.generateImprovements(parsedContent, analysis)

    // 5. Store results
    await this.storeResults(sessionId, analysis, improvements)

    return { analysis, improvements }
  }

  protected validateInput(input: any): boolean {
    return !!(input.documentId && input.sessionId && input.userId)
  }

  private async generateAnalysis(content: any) {
    const prompt = CVPrompts.analysisPrompt(content)
    const response = await this.llm.invoke(prompt)
    return this.parseResponse(response.content)
  }
}
```

### Prompt Engineering

#### 1. Prompt Templates

```typescript
// src/lib/prompts/cv-prompts.ts
export class CVPrompts {
  static analysisPrompt(cvContent: any): string {
    return `
    Analyze the following CV content and provide comprehensive feedback:

    ${JSON.stringify(cvContent, null, 2)}

    Please provide analysis in the following JSON format:
    {
      "overallScore": 0-100,
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "recommendations": [
        {
          "category": "structure|content|formatting",
          "priority": "high|medium|low",
          "description": "What to improve and why",
          "example": {
            "before": "current text",
            "after": "improved text"
          }
        }
      ]
    }
    `
  }
}
```

#### 2. Response Parsing

```typescript
// Parse LLM responses safely
private parseLLMResponse(content: string): any {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
    const jsonString = jsonMatch ? jsonMatch[1] : content

    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Failed to parse LLM response:', error)
    throw new Error('Invalid response format from AI')
  }
}
```

## Testing Guidelines

### Unit Testing

#### 1. Service Testing

```typescript
// src/lib/services/__tests__/document-parser.test.ts
import { DocumentParser } from '../document-parser'
import { describe, it, expect } from 'vitest'

describe('DocumentParser', () => {
  let parser: DocumentParser

  beforeEach(() => {
    parser = new DocumentParser()
  })

  describe('parseDocument', () => {
    it('should parse PDF content correctly', async () => {
      const buffer = Buffer.from('mock PDF content')
      const result = await parser.parseDocument(buffer, 'pdf')

      expect(result.text).toBeDefined()
      expect(result.documents).toHaveLength(1)
      expect(result.metadata?.pages).toBeGreaterThan(0)
    })

    it('should handle unsupported file types', async () => {
      const buffer = Buffer.from('content')

      await expect(
        parser.parseDocument(buffer, 'unsupported')
      ).rejects.toThrow('Unsupported file type')
    })
  })
})
```

#### 2. Component Testing

```typescript
// src/components/__tests__/document-uploader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentUploader } from '../document-uploader'

describe('DocumentUploader', () => {
  it('should render upload button', () => {
    render(<DocumentUploader onUpload={jest.fn()} />)
    expect(screen.getByText('Upload Document')).toBeInTheDocument()
  })

  it('should call onUpload when file is selected', async () => {
    const onUpload = jest.fn()
    render(<DocumentUploader onUpload={onUpload} />)

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByRole('button')

    fireEvent.click(input)
    // Simulate file selection
    // onUpload should be called with the file
  })
})
```

### Integration Testing

#### 1. Server Action Testing

```typescript
// src/actions/__tests__/documents.test.ts
import { uploadDocument } from '../documents'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server')

describe('uploadDocument', () => {
  it('should upload document successfully', async () => {
    // Mock authentication
    const mockSupabase = {
      auth: { getUser: jest.fn().ResolvedValue({ data: { user: { id: 'user1' } } }) },
      storage: { from: jest.fn().mockReturnValue({ upload: jest.fn() }) },
      from: jest.fn().mockReturnValue({ insert: jest.fn().mockResolvedValue({ data: { id: 'doc1' } }) })
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    const result = await uploadDocument({
      file: new File(['content'], 'test.pdf'),
      userId: 'user1'
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})
```

## Debugging and Troubleshooting

### 1. Debug Mode

Enable debug logging:

```typescript
// lib/debug.ts
export const DEBUG = process.env.NODE_ENV === 'development'

export function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data)
  }
}

// Usage
debugLog('Document upload started', { fileName, fileSize })
```

### 2. Error Monitoring

```typescript
// lib/error-monitoring.ts
export class ErrorMonitor {
  static captureError(error: Error, context?: any) {
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    })

    // Send to error monitoring service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: context })
    }
  }
}
```

### 3. Database Debugging

```typescript
// Debug database queries
import { db } from '@/lib/db'

async function debugQuery<T>(query: any, label: string): Promise<T[]> {
  console.log(`[DB Query] ${label}:`, query.toSQL())

  try {
    const result = await query
    console.log(`[DB Result] ${label}:`, result.length, 'rows')
    return result
  } catch (error) {
    console.error(`[DB Error] ${label}:`, error)
    throw error
  }
}
```

## Performance Optimization

### 1. Database Optimization

#### Indexing Strategy

```sql
-- Create indexes for common queries
CREATE INDEX idx_documents_user_id_created_at ON documents(user_id, created_at DESC);
CREATE INDEX idx_tasks_session_id_status ON tasks(session_id, status);
CREATE INDEX idx_cv_embeddings_document_id ON cv_embeddings(document_id);

-- Vector index for similarity search
CREATE INDEX idx_cv_embeddings_embedding ON cv_embeddings
USING ivfflat (embedding vector_cosine_ops);
```

#### Query Optimization

```typescript
// Efficient database queries
export async function getUserDocumentsWithPagination(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit

  return await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(documents.createdAt))
}
```

### 2. Caching Strategy

```typescript
// lib/cache-service.ts
export class CacheService {
  async get<T>(key: string, userId?: string): Promise<T | null> {
    const cacheKey = userId ? `user:${userId}:${key}` : `public:${key}`

    const { data } = await this.supabase
      .from('cache')
      .select('value')
      .eq('key', cacheKey)
      .single()

    return data?.value || null
  }

  async set<T>(key: string, value: T, userId?: string, ttl: number = 3600) {
    const cacheKey = userId ? `user:${userId}:${key}` : `public:${key}`

    await this.supabase
      .from('cache')
      .upsert({
        key: cacheKey,
        value,
        expires_at: new Date(Date.now() + ttl * 1000).toISOString()
      })
  }
}
```

### 3. Frontend Optimization

#### Code Splitting

```typescript
// Lazy load components
const CVAnalysisClient = dynamic(
  () => import('@/components/cv/cv-analysis-client'),
  {
    loading: () => <div>Loading analysis...</div>,
    ssr: false
  }
)
```

#### Image Optimization

```typescript
import Image from 'next/image'

export function DocumentPreview({ src, alt }: { src: string, alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={300}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}
```

## Security Best Practices

### 1. Authentication and Authorization

```typescript
// Secure server action pattern
export async function secureAction(input: any) {
  // 1. Verify user authentication
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  // 2. Validate input
  const validatedInput = validateInput(input)

  // 3. Execute with user context
  return await executeOperation(validatedInput, user.id)
}
```

### 2. Input Validation

```typescript
// Zod validation schemas
import { z } from 'zod'

const documentSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['cv', 'jd', 'cover_letter']),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export function validateDocumentInput(input: unknown) {
  return documentSchema.parse(input)
}
```

### 3. Data Sanitization

```typescript
// Sanitize user inputs
import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side sanitization
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  return DOMPurify.sanitize(html)
}
```

### 4. Rate Limiting

```typescript
// Rate limiting implementation
export async function checkRateLimit(
  identifier: string,
  limit: number,
  window: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now()
  const windowStart = now - window * 1000

  // Remove old entries
  await supabase
    .from('rate_limits')
    .delete()
    .lt('created_at', new Date(windowStart).toISOString())

  // Count current entries
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)

  const currentCount = count || 0

  if (currentCount >= limit) {
    return { success: false, remaining: 0, reset: windowStart + window * 1000 }
  }

  // Add new entry
  await supabase
    .from('rate_limits')
    .insert({ identifier })

  return {
    success: true,
    remaining: limit - currentCount - 1,
    reset: now + window * 1000
  }
}
```

## Contributing Guidelines

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation

3. **Run Tests**
   ```bash
   npm run lint
   npm run build
   npm run test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Code Review Checklist

- [ ] Code follows project coding standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] Security implications are considered
- [ ] Performance impact is evaluated
- [ ] Error handling is implemented
- [ ] Types are properly defined
- [ ] User experience is considered

This developer guide provides comprehensive information for contributing to the AI Job Hunt Agent project. Follow these patterns and guidelines to ensure consistent, maintainable, and high-quality code.