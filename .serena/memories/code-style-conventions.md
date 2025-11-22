# Code Style & Conventions - AI Job Hunt Agent

## File Structure & Organization

### Path Aliases
Use `@/*` for all imports:
```typescript
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DocumentRepository } from '@/lib/repositories/document.repository'
```

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected routes
│   ├── api/               # Route handlers
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Core libraries and utilities
│   ├── agents/           # AI agent implementations
│   ├── services/         # Business logic services
│   ├── repositories/     # Data access layer
│   ├── utils/           # Helper functions
│   └── types/           # TypeScript type definitions
├── actions/              # Server Actions ('use server')
└── __tests__/           # Test files
```

## TypeScript Conventions

### Strict Configuration
- **Strict mode**: Enabled in `tsconfig.strict.json`
- **No implicit any**: All types must be explicitly defined
- **Strict null checks**: Null safety enforced
- **Path aliases**: Use `@/*` for clean imports

### Type Definitions
```typescript
// Use interfaces for object shapes
interface Document {
  id: string;
  user_id: string;
  title: string;
  parsed_content: DocumentContent;
  created_at: string;
  updated_at: string;
}

// Use types for unions or computed types
type DocumentStatus = 'processing' | 'completed' | 'failed';
type SkillGapTimeline = 'short' | 'medium' | 'long';
```

### Generic Types
```typescript
// Repository pattern with generics
class BaseRepository<T> {
  async findById(id: string): Promise<T | null> {
    // Implementation
  }
}

// Service responses with proper typing
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## React Component Patterns

### Server Components (Default)
- Use Server Components by default
- Only mark components with `'use client'` when necessary
- Good for: static content, data fetching, no interactivity

### Client Components
- Use only when needed for: event handlers, React hooks, browser APIs
- Mark with `'use client'` directive at top of file
- Keep client components minimal and focused

```typescript
'use client'

import { useState } from 'react'

export function InteractiveComponent() {
  const [isOpen, setIsOpen] = useState(false)
  // Interactive logic here
}
```

### Component Structure
```typescript
// Props interface
interface ComponentProps {
  title: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

// Default export
export function Component({ title, onAction, children }: ComponentProps) {
  return (
    <div className="component-wrapper">
      <h2>{title}</h2>
      {children}
      {onAction && <button onClick={onAction}>Action</button>}
    </div>
  )
}
```

## Database & Repository Patterns

### Repository Pattern
```typescript
// Base repository with common CRUD operations
export class BaseRepository<T> {
  constructor(protected supabase: SupabaseClient) {}

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.getTableName())
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }

  protected abstract getTableName(): string
}

// Feature-specific repository
export class DocumentRepository extends BaseRepository<Document> {
  protected getTableName(): string {
    return 'documents'
  }

  async findByUserId(userId: string): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}
```

### RLS-Aware Operations
```typescript
// Always use user context from auth
export async function userSpecificOperation() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  // RLS policies will automatically filter by user_id
  return await supabase.from('documents').select('*')
}
```

## Server Actions Pattern

### Server Actions Structure
```typescript
// actions/cv.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function triggerCVAnalysis(documentId: string, sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  try {
    // Create task record
    const { error: taskError } = await supabase.from('tasks').insert({
      session_id: sessionId,
      task_type: 'cv_analysis',
      status: 'processing',
      metadata: { documentId, userId: user.id }
    })

    if (taskError) throw taskError

    // Execute analysis...
    
    // Revalidate relevant paths
    revalidatePath('/dashboard/cv-analysis')
    
    return { success: true }
  } catch (error) {
    console.error('CV Analysis failed:', error)
    throw new Error('CV analysis failed')
  }
}
```

## Service Layer Architecture

### Service Pattern
```typescript
// lib/services/cv-service.ts
export class CVAnalysisService {
  constructor(
    private supabase: SupabaseClient,
    private llmService: LLMService
  ) {}

  async analyzeCV(documentId: string, userId: string): Promise<CVAnalysis> {
    // Business logic implementation
    const document = await this.getDocument(documentId, userId)
    const analysis = await this.llmService.analyze(document.content)
    
    return this.saveAnalysis(documentId, analysis)
  }

  private async getDocument(documentId: string, userId: string) {
    // RLS will ensure user can only access their own documents
    const { data, error } = await this.supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()
    
    if (error) throw error
    return data
  }
}
```

## Error Handling Patterns

### Centralized Error Handling
```typescript
// lib/utils/error-handler.ts
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'ApplicationError'
  }
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): never {
    if (error instanceof ApplicationError) {
      console.error(`Application Error [${error.code}]: ${error.message}`, error.context)
      throw error
    }
    
    console.error(`Unexpected error${context ? ` in ${context}` : ''}:`, error)
    throw new ApplicationError('An unexpected error occurred', 'INTERNAL_ERROR')
  }
}
```

## Naming Conventions

### Files and Directories
- **Components**: PascalCase (e.g., `DocumentSelector.tsx`)
- **Services**: kebab-case (e.g., `document-service.ts`)
- **Utilities**: kebab-case (e.g., `error-handler.ts`)
- **Types**: kebab-case (e.g., `database-types.ts`)
- **Actions**: kebab-case (e.g., `cv-analysis.ts`)

### Variables and Functions
- **Variables**: camelCase (e.g., `documentId`, `cvAnalysis`)
- **Functions**: camelCase with descriptive verbs (e.g., `analyzeDocument`, `fetchUserDocuments`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `DEFAULT_TTL`)
- **Types/Interfaces**: PascalCase (e.g., `Document`, `CVAnalysisResult`)

### Database Naming
- **Tables**: snake_case plural (e.g., `documents`, `cv_embeddings`)
- **Columns**: snake_case (e.g., `user_id`, `created_at`, `parsed_content`)
- **Foreign Keys**: `{table}_id` pattern (e.g., `user_id`, `document_id`)

## Code Quality Rules

### Import Organization
```typescript
// 1. External libraries
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// 2. Internal lib imports
import { Button } from '@/components/ui/button'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

// 3. Relative imports
import { DocumentPreview } from './document-preview'
```

### Function Organization
- Keep functions small and focused
- Use early returns for error handling
- Prefer composition over inheritance
- Use dependency injection for services

### Commenting Standards
- Use JSDoc for public functions and complex logic
- Comments should explain "why", not "what"
- Keep comments up-to-date with code changes

```typescript
/**
 * Triggers CV analysis for a given document
 * @param documentId - The ID of the document to analyze
 * @param sessionId - Current session ID for task tracking
 * @returns Promise resolving to analysis result
 * @throws ApplicationError if analysis fails
 */
export async function triggerCVAnalysis(documentId: string, sessionId: string) {
  // Implementation
}
```