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

This is an **AI-powered job hunting agent system** built with **Next.js 16**, using a multi-agent architecture to help job seekers with CV analysis, interview preparation, cover letter generation, and skill gap analysis. The system is now feature-complete with all core functionality implemented.

**Key Architecture Principles:**
- **Privacy-first**: No automatic job applications or email sending
- **Human-in-the-loop**: All CV changes require user approval
- **Supabase-only data layer**: PostgreSQL (with pgvector), Storage, and Auth - no Redis or Inngest
- **Row Level Security (RLS)**: All database operations respect user context through RLS policies
- **Full-stack Next.js**: Server Components, Server Actions, and Route Handlers

## Development Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint

# Database Management
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio for database management
npm run db:cleanup   # Clean database and reset
npm run db:apply-rls # Apply RLS policies to database
npm run db:fix-rls   # Fix RLS policies for documents table
npm run db:fix-all-rls # Fix all RLS policies
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
- LangGraph.js + LangChain.js for AI agent orchestration
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
├── (dashboard)/         # Protected routes (dashboard, workflow, history)
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
├── agents/             # LangGraph agents (orchestrator, cv, interview, skill-gap, etc.)
├── services/           # Business logic
│   ├── document-parser.ts         # PDF/DOCX/TXT parsing service
│   ├── llm-service.ts             # LLM integration service
│   ├── skill-gap-service.ts       # Skill gap analysis business logic
│   └── ...                       # Other services
├── prompts/            # LLM prompt templates
│   └── skill-gap-prompts.ts       # Skill gap analysis prompts
├── supabase/           # Supabase utilities
│   ├── server.ts                 # Server-side Supabase client
│   └── middleware.ts             # Auth middleware
├── utils/              # Helper functions
└── types/              # TypeScript types

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
└── cleanup-database.ts          # Clean database
```

## Critical Security Requirements

### Row Level Security (RLS)

**IMPORTANT:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and should be used with caution:
- **Development**: Can be used for testing, seeding databases, or admin operations
- **Production**: NEVER use in production client-facing code - it creates security vulnerabilities

**For standard operations, always use:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side operations (respects RLS)
- Server-side Supabase clients created via `createClient()` (inherit user context from cookies)
- `SUPABASE_SERVICE_ROLE_KEY` only in development for admin tasks or when you explicitly need to bypass RLS

**RLS-Aware Cache Keys:**
All cache operations must use user-scoped keys:
- User data: `user:{userId}:{key}` (e.g., `user:123e4567:cv_analysis`)
- Public data: `public:{key}` (e.g., `public:job_categories`)

RLS policies use regex pattern matching on cache keys to enforce access control at the database level.

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

### Multi-Agent System (LangGraph.js)

The system uses specialized agents coordinated by an orchestrator:

1. **Orchestrator Agent**: Routes requests to specialized agents, manages workflow state
2. **CV Agent**: Parses, analyzes CVs, generates improvements with human approval
3. **Interview Agent**: Generates mock interview questions, provides feedback
4. **Cover Letter Agent**: Creates personalized cover letters from CV + JD
5. **Skill Gap Agent**: Identifies missing skills, creates learning roadmap with timeline organization (short/medium/long term)

**Agent Communication:**
- Agents communicate via LangGraph state channels
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

**Note:** `.env.example` incorrectly includes `UPSTASH_REDIS_*` and `INNGEST_*` variables. These should be removed as they are not used in the final architecture (we use PostgreSQL for caching and background jobs).

## Implementation Guidelines

### Server vs Client Components

**Default to Server Components** unless you need:
- Interactive event handlers (onClick, onChange, etc.)
- React hooks (useState, useEffect, etc.)
- Browser-only APIs

Mark Client Components with `'use client'` directive at the top of the file.

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

## Testing

The project includes comprehensive testing documentation in `TESTING.md` which covers:
- Document upload and preview functionality
- CV analysis workflow (existing vs new documents)
- Skill gap analysis with timeline organization and status tracking
- Cover letter generation with document reuse
- Interview preparation with document integration
- Database RLS policy testing

## Reference Documentation

The complete architecture specification is in `spec-nextjs.md` (76KB), which includes:
- Detailed database schema with Drizzle ORM definitions
- Complete agent implementation examples
- Workflow state machine diagrams
- API endpoint specifications
- Supabase client setup patterns
- RLS policy SQL examples

Refer to this file for detailed implementation patterns when building features.
