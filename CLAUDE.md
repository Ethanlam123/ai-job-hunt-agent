<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI-powered job hunting agent system** built with **Next.js 16**, using a multi-agent architecture to help job seekers with CV analysis, interview preparation, cover letter generation, and skill gap analysis. The system is feature-complete with production-ready security implementations and Serena AI code analysis capabilities.

**Key Architecture Principles:**
- **Privacy-first**: No automatic job applications or email sending
- **Human-in-the-loop**: All CV changes require user approval
- **Supabase-only data layer**: PostgreSQL (with pgvector), Storage, and Auth - no Redis or Inngest
- **Row Level Security (RLS)**: All database operations respect user context through RLS policies
- **Full-stack Next.js**: Server Components, Server Actions, and Route Handlers
- **Security-First**: Production environment validation prevents service role key exposure

## Development Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:strict  # Run ESLint with strict rules
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
npm run test         # Run test suite
npm run test:e2e     # Run end-to-end tests
npm run test:integration # Run integration tests
npm run test:security # Run security tests

# Database Management
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio for database management
npm run db:cleanup   # Clean database and reset
npm run db:apply-rls # Apply RLS policies to database
npm run db:fix-rls   # Fix RLS policies for documents table
npm run db:fix-all-rls # Fix all RLS policies

# OpenSpec Management
./scripts/setup-database.sh        # Automated setup with MCP (easiest)
./scripts/setup-database-sql.sh     # Automated setup without MCP
openspec list                     # List all changes and specs
openspec validate <change-id>      # Validate a change proposal
openspec show <change-id>          # Show change details
```

## Architecture Overview

### Technology Stack

**Frontend:**
- Next.js 16 App Router with React 19.2.0
- Server Components (default) and Client Components (for interactivity)
- Tailwind CSS v4 with shadcn/ui components
- TypeScript with strict mode

**Backend:**
- Next.js Route Handlers (`app/api/*/route.ts`)
- Server Actions (`'use server'`) for mutations
- LangChain.js for AI agent orchestration
- OpenRouter (GPT-5-nano) for LLM operations
- OpenAI (text-embedding-3-small) for embeddings

**Data Layer (Supabase Only):**
- **PostgreSQL**: Primary database with pgvector extension for vector embeddings
- **Cache**: PostgreSQL table with JSONB values (no Redis)
- **Rate Limiting**: PostgreSQL-based sliding window (no Redis)
- **Background Jobs**: Server Actions + PostgreSQL task tracking (no Inngest)
- **File Storage**: Supabase Storage (S3-compatible)
- **Auth**: Supabase Auth with cookie-based sessions
- **ORM**: Drizzle ORM for type-safe database access

**Document Processing:**
- **PDF Parsing**: pdf-parse library
- **DOCX Parsing**: mammoth library
- **Text Extraction**: Automatic parsing with DocumentParser service
- **Content Storage**: Parsed content stored in JSONB with sections extraction

### Project Structure (Current Implementation)

```
app/
├── (auth)/              # Auth route group (login, register)
├── (dashboard)/         # Protected routes (dashboard, workflow)
│   ├── cv-analysis/     # CV analysis page
│   ├── skill-gap/       # Skill gap analysis page
│   ├── cover-letter/    # Cover letter generation
│   ├── interview/       # Interview preparation
│   ├── documents/       # Document management
│   └── dashboard/       # Main dashboard
├── api/                 # Route Handlers
│   ├── documents/       # File upload/management
│   └── ...              # Other API endpoints
├── layout.tsx          # Root layout
└── page.tsx            # Home page

components/
├── ui/                 # shadcn/ui components
├── documents/          # Document-related components
│   ├── document-selector.tsx     # Document dropdown selector
│   ├── document-preview-dialog.tsx # Document preview dialog
│   └── documents-client.tsx      # Document management interface
├── cv-analysis/        # CV analysis components
├── skill-gap/          # Skill gap analysis components
├── cover-letter/       # Cover letter generation components
├── interview/          # Interview practice components
└── shared/             # Shared components

lib/
├── agents/             # AI agents (cv, interview, skill-gap, etc.)
├── services/           # Business logic
│   ├── document-parser.ts         # PDF/DOCX/TXT parsing service
│   ├── llm-service.ts             # LLM integration service
│   ├── skill-gap-service.ts       # Skill gap analysis business logic
│   ├── database-service.ts        # Enhanced database service with connection pooling
│   ├── vector-search-service.ts   # Optimized vector search with caching
│   └── ...                       # Other services
├── config/             # Configuration management
│   ├── app-config.ts              # Centralized app configuration
│   └── database.ts                # Database configuration and connection settings
├── repositories/       # Repository pattern for data access
│   ├── base.repository.ts         # Base repository with CRUD operations
│   ├── user.repository.ts         # User-specific repository
│   └── document.repository.ts     # Document-specific repository
├── prompts/            # LLM prompt templates
│   └── skill-gap-prompts.ts       # Skill gap analysis prompts
├── supabase/           # Supabase utilities
│   ├── server.ts                 # Server-side Supabase client
│   └── middleware.ts             # Auth middleware
├── utils/              # Helper functions
│   ├── error-handler.ts           # Centralized error handling
│   └── logger.ts                  # Environment-aware logging
├── types/              # TypeScript types
│   └── database.ts                # Database type definitions
└── api/                # API documentation utilities
    └── documentation.ts           # JSDoc-based API documentation

actions/                # Server Actions ('use server')
├── documents.ts        # Document upload, fetch, delete operations
├── cv.ts              # CV analysis operations
├── skill-gap.ts       # Skill gap analysis operations
├── cover-letter.ts    # Cover letter generation
└── interview.ts       # Interview practice

scripts/               # Database management scripts
├── apply-rls-policies.ts        # Apply RLS policies
├── fix-rls-documents.ts         # Fix document RLS policies
├── fix-all-rls-policies.ts      # Fix all RLS policies
├── cleanup-database.ts          # Clean database
├── test-storage-upload.js       # Storage upload diagnostic script
└── setup-storage-bucket.sql     # Storage bucket setup SQL
```

## Code Quality and Development Standards

### Strict Configuration

The project uses strict TypeScript and ESLint configuration for maximum code quality:

- **TypeScript**: `tsconfig.strict.json` with strict null checks, no implicit any, and comprehensive type safety
- **ESLint**: `.eslintrc.strict.json` with security rules, performance optimization, and code consistency
- **Prettier**: `.prettierrc.strict.json` with consistent formatting standards

### Repository Pattern

Data access is implemented through the repository pattern for separation of concerns:

```typescript
// Example: Using the document repository
import { DocumentRepository } from '@/lib/repositories/document.repository'

const documentRepo = new DocumentRepository(supabase)
const documents = await documentRepo.findByUserId(userId)
```

### Error Handling

Centralized error handling provides consistent error responses:

```typescript
import { ErrorHandler, ApplicationError } from '@/lib/utils/error-handler'

const error = new ApplicationError(
  'Document upload failed',
  'UPLOAD_ERROR',
  { fileName, fileSize }
)
```

### Testing Strategy

Comprehensive test coverage includes:

- **Integration Tests**: Database operations, connection pooling, transactions
- **E2E Tests**: Complete user workflows (registration, document upload, CV analysis)
- **Security Tests**: Authentication bypass prevention, data leakage detection
- **Unit Tests**: Individual service and repository methods

### Configuration Management

All application constants and magic numbers are centralized in `src/lib/config/app-config.ts`:

```typescript
export const APP_CONFIG = {
  FILE_UPLOAD: {
    MAX_SIZE_MB: 10,
    ALLOWED_TYPES: ['application/pdf', 'text/plain'],
  },
  CACHE: {
    DEFAULT_TTL: 3600,
    USER_PREFIX: 'user:',
  },
  // ... other configurations
}
```

## Critical Security Requirements

### Supabase API Key Security

**CRITICAL SECURITY IMPLEMENTATION:** The system supports both legacy and new Supabase API key formats with production-safe validation:

#### API Key Formats

| Type | Format | Status | Use Case |
|------|--------|--------|----------|
| **Publishable** | `sb_publishable_...` | ✅ Recommended | Client-side, replaces `anon` key |
| **Secret** | `sb_secret_...` | ✅ Recommended | Server-side only, replaces `service_role` |
| `anon` | JWT-based | ⚠️ Legacy | Same as publishable key |
| `service_role` | JWT-based | ⚠️ Deprecated | Same as secret keys |

#### Security Validation

**Production Environment Protection:**
- Both `SUPABASE_SERVICE_ROLE_KEY` (legacy) and `SUPABASE_SECRET_KEY` (new) are **automatically blocked**
- Build fails if either elevated key is detected
- Multi-layer validation: configuration → build-time → runtime

**Development/Test Environments:**
- Elevated keys are **allowed and often required** for:
  - Database cleanup in tests
  - Applying RLS policies
  - Admin operations
  - Integration test setup

**Which Key to Use:**
```bash
# Development/Test (use either or both)
SUPABASE_SECRET_KEY=sb_secret_...         # Recommended (has browser protection)
SUPABASE_SERVICE_ROLE_KEY=<legacy-key>    # Deprecated but still works

# Production (NEVER use elevated keys)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...  # Only this key
```

#### New Secret Key Benefits

The `sb_secret_...` format provides improvements over legacy JWT-based keys:
- **Browser Protection**: Returns HTTP 401 when used in browsers (User-Agent check)
- **Easier Rotation**: Can rotate without downtime
- **Better Security**: You can disable unused keys
- **No JWT Issues**: Not tied to JWT secret rotation

**OpenSpec Proposals:**
- See `openspec/changes/fix-critical-code-review-issues/` for Secret key implementation
- See `openspec/changes/secure-service-role-key/` for original security implementation

**Security Validation Layers:**
1. Configuration schema validates environment variables
2. Build-time validation fails production builds with elevated keys
3. Runtime validation checks during application startup

### Row Level Security (RLS)

**RLS-Aware Cache Keys:**
All cache operations must use user-scoped keys:
- User data: `user:{userId}:{key}` (e.g., `user:123e4567:cv_analysis`)
- Public data: `public:{key}` (e.g., `public:job_categories`)

RLS policies use regex pattern matching on cache keys to enforce access control at the database level.

### SQL Injection Prevention

**Vector Search Security:**
- Supabase RPC function `vector_search()` uses parameterized queries
- PostgreSQL `format()` function for safe query construction
- Whitelist validation for table and column names
- See `supabase/migrations/20260110000001_vector_search_rpc.sql`

**Example Safe Pattern:**
```typescript
// GOOD: Using RPC function with parameterization
const { data } = await supabase.rpc('vector_search', {
  query_vector: embedding,
  search_table: 'cv_embeddings',
  vector_col: 'embedding',
})

// BAD: Raw SQL string concatenation (NEVER do this)
const query = `SELECT * FROM ${tableName} WHERE ...` // SQL injection risk!
```

### Cryptographic Hashing

**Cache Key Hashing:**
- SHA-256 based hash function for cache keys (replaced weak DJB2)
- Collision-resistant with 16-character hexadecimal output
- Handles unicode, special characters, and large inputs
- See `src/lib/services/vector-search-service.ts`

### Memory Management

**LRU Cache Implementation:**
- `embeddingCache`: Max 1000 entries, 1 hour TTL
- `processingJobs`: Max 100 entries, 30 minute TTL
- Automatic eviction prevents memory leaks
- See `src/__tests__/unit/lru-cache.test.ts`

### Error Message Sanitization

**Production Error Handling:**
- Full errors logged server-side only
- Generic messages returned to clients
- No database schema exposed
- Sensitive fields redacted from logs
- See `src/lib/utils/error-handler.ts`

### Document Processing Pipeline

All uploaded documents are automatically parsed and processed:

1. **File Upload**: User uploads PDF, DOCX, or TXT files via DocumentUploader
2. **Parsing**: `DocumentParser` extracts text content and metadata
   - PDF: Uses `pdf-parse` library
   - DOCX: Uses `mammoth` library
   - TXT: Direct text extraction
3. **Content Storage**: Parsed content stored in `documents.parsed_content` field:
   ```typescript
   {
     fullText: string;           // Complete document text
     pageCount?: number;         // For PDF files
     wordCount?: number;         // Word count
     sections: Record<string, string>; // Extracted sections (for CVs)
   }
   ```
4. **Document Management**:
   - Documents can be previewed via DocumentPreviewDialog
   - Can be referenced by ID across all features (CV analysis, cover letters, etc.)
   - Prevents duplicate uploads when using existing documents

### Database Schema (Key Tables)

```typescript
// All tables have RLS policies enabled

users               // Managed by Supabase Auth
sessions            // User workflow sessions with state
messages            // Chat messages with agent responses
documents           // Uploaded CVs/JDs with parsed content (JSONB)
cv_embeddings       // Vector embeddings (pgvector, 1536 dimensions)
job_descriptions    // Job postings with embeddings
skill_gaps          // Skill gap analysis results with status tracking
tasks               // Background task status tracking
cache               // JSONB cache with TTL support
rate_limits         // Request timestamps for rate limiting
```

**Important RLS Policies:**
- Cache: Users access only `user:{userId}:*` keys or `public:*` keys
- Tasks: Users access only tasks linked to their sessions
- Documents: Users access only their own documents
- Skill Gaps: Users access only skill gaps from their own analyses

## AI Agent Architecture

### Multi-Agent System

The system uses specialized AI agents:

1. **CV Agent**: Parses, analyzes CVs, generates improvements with human approval
2. **Interview Agent**: Generates mock interview questions, provides feedback
3. **Cover Letter Agent**: Creates personalized cover letters from CV + JD
4. **Skill Gap Agent**: Identifies missing skills, creates learning roadmap with timeline organization (short/medium/long term)

**Agent Communication:**
- Each agent operates independently with direct database access
- State is managed through Server Actions and database records
- Long-running operations use Server Actions with PostgreSQL task tracking
- Clients poll task status or use Server-Sent Events (SSE) for real-time updates

### Background Job Pattern (No Inngest)

Since we don't use Inngest, background jobs are implemented as:

1. **Server Action** triggers async operation and creates task record in PostgreSQL
2. **Task record** stores status (processing/completed/failed) and result
3. **Client polls** task status via API endpoint or **subscribes via SSE**
4. Vercel serverless functions have generous timeouts for long operations

## Path Aliases

Use `@/*` for imports:
```typescript
import { createClient } from '@/lib/supabase/server'
import { CacheService } from '@/lib/services/cache-service'
import { Button } from '@/components/ui/button'
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # For development/admin tasks only - NEVER use in production client code

# Database (optional, for Drizzle ORM migrations)
DATABASE_URL=

# OpenRouter (LLM) - Uses GPT-5-nano model
OPENROUTER_API_KEY=

# OpenAI (Embeddings)
OPENAI_API_KEY=

# LangSmith (optional, for agent tracing)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=job-hunt-agent
LANGCHAIN_API_KEY=

# Optional
TAVILY_API_KEY=  # For web search
```

**Configuration Management:**
Most application settings are centralized in `src/lib/config/app-config.ts` rather than scattered throughout the codebase. Use environment variables only for external service credentials and deployment-specific settings.

**Note:** `.env.example` incorrectly includes `UPSTASH_REDIS_*` and `INNGEST_*` variables. These should be removed as they are not used in the final architecture (we use PostgreSQL for caching and background jobs).

## Implementation Guidelines

### Server vs Client Components

**Default to Server Components** unless you need:
- Interactive event handlers (onClick, onChange, etc.)
- React hooks (useState, useEffect, etc.)
- Browser-only APIs

Mark Client Components with `'use client'` directive at the top of the file.

### Enhanced Database Service

For complex database operations, use the enhanced database service with connection pooling:

```typescript
import { EnhancedDatabaseService } from '@/lib/services/database-service'

const dbService = new EnhancedDatabaseService(supabase)

// Use connection pooling for better performance
const result = await dbService.query('SELECT * FROM documents WHERE user_id = $1', [userId])

// Batch operations for improved performance
const documents = await dbService.batchInsert(docsArray)
```

### Vector Search Service

Use the optimized vector search service for embedding operations:

```typescript
import { VectorSearchService } from '@/lib/services/vector-search-service'

const vectorService = new VectorSearchService(supabase)

// Generate and search embeddings with caching
const results = await vectorService.findSimilarDocuments(queryEmbedding, userId)
```

### Server Actions Pattern

Server Actions (`'use server'`) are used for mutations and form submissions:

```typescript
// actions/cv.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function triggerCVAnalysis(documentId: string, sessionId: string) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  // Create task record
  await supabase.from('tasks').insert({
    session_id: sessionId,
    task_type: 'cv_analysis',
    status: 'processing',
    metadata: { documentId, userId: user.id }
  })

  // Execute async analysis...
}
```

### Cache Service Pattern

All cache operations must be RLS-aware:

```typescript
const cacheService = new CacheService(supabase)
const { data: { user } } = await supabase.auth.getUser()

// Store with user context
await cacheService.set('cv_analysis', data, user?.id, 3600)

// Retrieve with user context
const cached = await cacheService.get('cv_analysis', user?.id)
```

### PostgreSQL-Based Rate Limiting

Rate limiting uses PostgreSQL sliding window:

```typescript
const { success, remaining, reset } = await checkRateLimit(
  identifier,  // IP address or user ID
  10,          // Max requests
  10           // Window in seconds
)

if (!success) {
  return new Response('Rate limit exceeded', { status: 429 })
}
```

## Deployment

- **Platform**: Vercel (optimized for Next.js)
- **Edge Runtime**: For lightweight operations (auth middleware)
- **Node.js Runtime**: For agent processing and long-running tasks
- **Database**: Supabase hosted PostgreSQL
- **File Storage**: Supabase Storage

## Document Management Pattern

Most features support both "upload new document" and "use existing document" workflows:

```typescript
// Pattern in Server Actions
export async function featureWithDocument(
  formData: FormData | { documentId?: string }
) {
  const documentId = formData.get('documentId') as string

  if (documentId) {
    // Use existing document (fetch from database)
    const document = await getDocumentById(documentId)
    // Feature logic here...
  } else {
    // Upload new document (create new record)
    const uploadedDoc = await uploadDocument(formData)
    // Feature logic here...
  }
}
```

**Components using this pattern:**
- CV Analysis (`actions/cv.ts`)
- Skill Gap Analysis (`actions/skill-gap.ts`)
- Cover Letter Generation (`actions/cover-letter.ts`)
- Interview Preparation (`actions/interview.ts`)

## Skill Gap Analysis Feature

The most recently implemented feature provides comprehensive skill gap analysis:

**Key Capabilities:**
- **AI-Powered Analysis**: Compares CV skills against job requirements using LLM
- **Dynamic Skill Categorization**: Automatically categorizes skills as technical, soft, or domain-specific
- **Timeline Organization**: Organizes skill gaps by learning timeframe (short: 0-3 months, medium: 3-6 months, long: 6+ months)
- **Interactive Progress Tracking**: Users can update skill status (pending, in_progress, completed, not_interested)
- **Document Integration**: Supports both existing CV selection and new document upload
- **Quality Validation**: Validates job description quality and provides fallback analysis for insufficient information

**Implementation Architecture:**
- Sequential agent workflow with 3 nodes: CV parsing → Job analysis → Skill gap identification
- Status tracking using PostgreSQL JSONB field (compatible with existing schema)
- Graceful handling of legacy analyses with temporary IDs
- Real-time job description quality scoring with user guidance

**Files:**
- `src/lib/agents/skill-gap-agent.ts` - Sequential workflow agent
- `src/lib/services/skill-gap-service.ts` - Business logic and database operations
- `src/lib/prompts/skill-gap-prompts.ts` - LLM prompt templates
- `src/actions/skill-gap.ts` - Server actions
- `src/components/skill-gap/` - UI components
- `src/app/(dashboard)/skill-gap/page.tsx` - Feature page

## Serena AI Code Analysis

The project now includes Serena semantic code analysis capabilities for enhanced development and maintenance:

**Capabilities:**
- **Semantic Code Understanding**: Analyzes code structure without reading entire files
- **Symbol-Level Analysis**: Traces relationships between functions, classes, and modules
- **Intelligent Search**: Fast pattern matching and code exploration
- **Memory Management**: Maintains comprehensive project knowledge in structured memory files

**Memory Files:**
- `.serena/memories/project-overview.md` - Complete project understanding
- `.serena/memories/project-structure.md` - Detailed architecture documentation
- `.serena/memories/code-style-conventions.md` - Development standards and patterns
- `.serena/memories/development-commands.md` - Essential commands and workflows
- `.serena/memories/task-completion-checklist.md` - Quality assurance checklists

## OpenSpec Change Management

The project uses OpenSpec for structured change proposals and specification management:

**Recent Changes:**
- `secure-service-role-key`: Critical security fix to prevent service role key exposure in production
- Multi-layer validation (build-time, runtime, configuration) for production safety
- Comprehensive testing strategies and backward compatibility maintenance

**OpenSpec Commands:**
- `openspec list` - View all changes and specifications
- `openspec validate <change-id>` - Validate change proposals
- `openspec show <change-id>` - Display detailed change information

## Testing

The project includes a comprehensive test suite covering all critical functionality:

### Test Categories

- **Integration Tests** (`src/__tests__/integration/`): Database operations, connection pooling, transactions, and vector search
- **E2E Tests** (`src/__tests__/e2e/`): Complete user workflows including registration, document upload, CV analysis, and skill gap analysis
- **Security Tests** (`src/__tests__/security/`): Authentication bypass prevention, data leakage detection, and input validation

### Running Tests

```bash
npm run test              # Run all tests
npm run test:e2e          # Run end-to-end tests only
npm run test:integration  # Run integration tests only
npm run test:security     # Run security tests only
```

### Test Coverage Areas

- Document upload and preview functionality with proper error handling
- CV analysis workflow (existing vs new documents)
- Skill gap analysis with timeline organization and status tracking
- Cover letter generation with document reuse
- Interview preparation with document integration
- Database RLS policy testing and security validation
- Storage upload authentication and permission handling

### Storage Upload Testing

Use the diagnostic script to troubleshoot file upload issues:

```bash
node scripts/test-storage-upload.js
```

This script tests:
- Bucket existence and configuration
- RLS policy enforcement
- File path structure validation
- Authentication requirements

## Reference Documentation

The complete architecture specification is in `spec-nextjs.md` (76KB), which includes:
- Detailed database schema with Drizzle ORM definitions
- Complete agent implementation examples
- Workflow state machine diagrams
- API endpoint specifications
- Supabase client setup patterns
- RLS policy SQL examples

Refer to this file for detailed implementation patterns when building features.
