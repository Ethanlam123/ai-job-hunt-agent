# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI-powered job hunting agent system** built with **Next.js 16**, using a multi-agent architecture to help job seekers with CV analysis, interview preparation, cover letter generation, and skill gap analysis. The project is in early development stage with only the basic Next.js scaffolding currently implemented.

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

### Project Structure (Planned)

```
app/
├── (auth)/              # Auth route group (login, register)
├── (dashboard)/         # Protected routes (dashboard, workflow, history)
├── api/                 # Route Handlers
│   ├── auth/           # Auth callbacks
│   ├── documents/      # File upload/management
│   ├── agents/         # Agent endpoints (cv, interview, cover-letter)
│   ├── sessions/       # Session management
│   └── chat/           # Chat and SSE streaming
├── layout.tsx          # Root layout
└── page.tsx            # Home page

components/
├── ui/                 # shadcn/ui components
├── auth/               # Auth forms (Client Components)
├── chat/               # Chat interface (Client Components)
├── upload/             # File uploaders (Client Components)
└── workflow/           # Workflow UI (Client Components)

lib/
├── agents/             # LangGraph agents (orchestrator, cv, interview, etc.)
├── prompts/            # LLM prompt templates
├── services/           # Business logic (llm, document, cache, embedding)
├── db/                 # Database (Supabase client, Drizzle schema, queries)
├── supabase/           # Supabase utilities (client, server, middleware)
├── utils/              # Helper functions (parser, validators, etc.)
└── types/              # TypeScript types

actions/                # Server Actions ('use server')
├── auth.ts
├── cv.ts
├── session.ts
└── chat.ts
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

### Database Schema (Key Tables)

```typescript
// All tables have RLS policies enabled

users               // Managed by Supabase Auth
sessions            // User workflow sessions with state
messages            // Chat messages with agent responses
documents           // Uploaded CVs/JDs with parsed content
cv_embeddings       // Vector embeddings (pgvector, 1536 dimensions)
job_descriptions    // Job postings with embeddings
tasks               // Background task status tracking
cache               // JSONB cache with TTL support
rate_limits         // Request timestamps for rate limiting
```

**Important RLS Policies:**
- Cache: Users access only `user:{userId}:*` keys or `public:*` keys
- Tasks: Users access only tasks linked to their sessions
- Documents: Users access only their own documents

## AI Agent Architecture

### Multi-Agent System (LangGraph.js)

The system uses specialized agents coordinated by an orchestrator:

1. **Orchestrator Agent**: Routes requests to specialized agents, manages workflow state
2. **CV Agent**: Parses, analyzes CVs, generates improvements with human approval
3. **Interview Agent**: Generates mock interview questions, provides feedback
4. **Cover Letter Agent**: Creates personalized cover letters from CV + JD
5. **Skill Gap Agent**: Identifies missing skills, creates learning roadmap

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

# OpenRouter (LLM)
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

## Reference Documentation

The complete architecture specification is in `spec-nextjs.md` (76KB), which includes:
- Detailed database schema with Drizzle ORM definitions
- Complete agent implementation examples
- Workflow state machine diagrams
- API endpoint specifications
- Supabase client setup patterns
- RLS policy SQL examples

Refer to this file for detailed implementation patterns when building features.
