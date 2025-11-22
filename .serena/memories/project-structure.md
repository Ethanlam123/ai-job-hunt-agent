# Project Structure - AI Job Hunt Agent

## High-Level Architecture

### Technology Stack Overview
- **Frontend**: Next.js 16 App Router + React 19 + TypeScript
- **Backend**: Supabase (PostgreSQL + pgvector, Auth, Storage)
- **AI/LLM**: OpenRouter (GPT-5-nano) + OpenAI embeddings + LangChain.js
- **UI**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **Data**: Drizzle ORM + Row Level Security (RLS)

### Key Architectural Patterns
- **Multi-Agent System**: Specialized AI agents for CV, interview, cover letter, skill gap analysis
- **Human-in-the-Loop**: All CV modifications require explicit user approval
- **Privacy-First**: No automatic job applications or external communications
- **Server-First**: Default to Server Components, use Client Components only when necessary

## Directory Structure Deep Dive

### `src/app/` - Next.js App Router
```
app/
├── (auth)/                    # Authentication route group
│   ├── login/
│   └── register/
├── (dashboard)/               # Protected routes (require auth)
│   ├── cv-analysis/          # CV analysis feature
│   ├── skill-gap/            # Skill gap analysis
│   ├── cover-letter/         # Cover letter generation
│   ├── interview/            # Interview preparation
│   ├── documents/            # Document management
│   └── dashboard/            # Main dashboard
├── api/                      # Route handlers (API endpoints)
│   ├── documents/           # File upload/management endpoints
│   └── ...                  # Other API routes
├── layout.tsx               # Root layout with providers
├── page.tsx                 # Landing page
└── globals.css              # Global styles
```

### `src/components/` - React Components
```
components/
├── ui/                      # shadcn/ui base components
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── ...                  # Other UI primitives
├── documents/               # Document-related components
│   ├── document-selector.tsx     # Dropdown for existing documents
│   ├── document-preview-dialog.tsx # Document preview modal
│   ├── document-uploader.tsx      # File upload component
│   └── documents-client.tsx       # Document management interface
├── cv-analysis/             # CV analysis feature components
├── skill-gap/               # Skill gap analysis components
├── cover-letter/            # Cover letter generation components
├── interview/               # Interview preparation components
└── shared/                  # Shared/reusable components
```

### `src/lib/` - Core Libraries & Services
```
lib/
├── agents/                  # AI agent implementations
│   ├── cv-agent.ts         # CV analysis agent
│   ├── interview-agent.ts  # Interview preparation agent
│   ├── cover-letter-agent.ts # Cover letter generation
│   └── skill-gap-agent.ts  # Skill gap analysis agent
├── services/               # Business logic services
│   ├── document-parser.ts      # PDF/DOCX/TXT parsing
│   ├── llm-service.ts          # LLM integration
│   ├── skill-gap-service.ts    # Skill gap business logic
│   ├── database-service.ts     # Enhanced DB with connection pooling
│   ├── vector-search-service.ts # Vector search with caching
│   └── cache-service.ts        # RLS-aware caching
├── repositories/           # Data access layer (Repository pattern)
│   ├── base.repository.ts      # Base repository with CRUD
│   ├── user.repository.ts      # User-specific operations
│   └── document.repository.ts  # Document-specific operations
├── supabase/              # Supabase utilities
│   ├── server.ts               # Server-side Supabase client
│   ├── middleware.ts           # Auth middleware
│   └── client.ts               # Client-side Supabase client
├── config/                # Configuration management
│   └── app-config.ts           # Centralized app configuration
├── types/                 # TypeScript type definitions
│   └── database.ts             # Database schema types
├── utils/                 # Helper functions
│   ├── error-handler.ts        # Centralized error handling
│   └── logger.ts               # Environment-aware logging
├── prompts/               # LLM prompt templates
│   └── skill-gap-prompts.ts    # Skill gap analysis prompts
└── api/                   # API documentation utilities
    └── documentation.ts        # JSDoc-based API docs
```

### `src/actions/` - Server Actions
```
actions/
├── documents.ts          # Document upload, fetch, delete operations
├── cv.ts                # CV analysis operations
├── skill-gap.ts         # Skill gap analysis operations
├── cover-letter.ts      # Cover letter generation
└── interview.ts         # Interview preparation operations
```

## Database Schema Architecture

### Core Tables (15 total)
```sql
-- User Management
users                   -- Supabase Auth sync (RLS protected)
sessions               -- User workflow sessions with state
messages               -- Chat messages with agent responses

-- Document Management
documents              -- Uploaded CVs/JDs with parsed content (JSONB)
cv_embeddings         -- Vector embeddings (pgvector, 1536 dimensions)
job_descriptions      -- Job postings with embeddings

-- Feature Data
skill_gaps            -- Skill gap analysis results with timeline organization
tasks                 -- Background task status tracking

-- System Tables
cache                 -- JSONB cache with TTL support (RLS scoped)
rate_limits          -- Request timestamps for PostgreSQL-based rate limiting
```

### Key Schema Features
- **Vector Embeddings**: pgvector extension for similarity search
- **JSONB Storage**: Flexible content and metadata storage
- **RLS Policies**: All tables have Row Level Security enabled
- **UUID Keys**: Secure, scalable primary keys
- **Audit Trails**: created_at/updated_at timestamps

## Agent System Architecture

### Multi-Agent Workflow
Each agent operates independently with specialized responsibilities:

1. **CV Agent** (`cv-agent.ts`)
   - Parses and analyzes CV content
   - Generates improvement suggestions
   - Requires human approval for changes

2. **Interview Agent** (`interview-agent.ts`)
   - Generates mock interview questions
   - Provides answer evaluation and feedback
   - Adapts questions based on CV content

3. **Cover Letter Agent** (`cover-letter-agent.ts`)
   - Creates personalized cover letters
   - Combines CV content with job requirements
   - Maintains professional tone and structure

4. **Skill Gap Agent** (`skill-gap-agent.ts`)
   - Compares CV skills against job requirements
   - Organizes learning paths by timeline (short/medium/long)
   - Tracks progress and provides updates

### Agent Communication Pattern
- **State Management**: Through Server Actions and database records
- **Background Operations**: PostgreSQL task tracking (no Inngest)
- **Real-time Updates**: Server-Sent Events (SSE) for long operations
- **Error Handling**: Centralized error handling with proper user feedback

## Service Layer Architecture

### Repository Pattern Implementation
```typescript
// Base repository provides common CRUD operations
BaseRepository<T>
├── DocumentRepository extends BaseRepository
├── UserRepository extends BaseRepository
└── SkillGapRepository extends BaseRepository
```

### Service Layer Responsibilities
- **DocumentParser**: Handles PDF, DOCX, TXT parsing with automatic content extraction
- **LLMService**: Centralized LLM integration with OpenRouter and OpenAI
- **VectorSearchService**: Optimized similarity search with caching
- **CacheService**: RLS-aware user-scoped caching
- **DatabaseService**: Enhanced database operations with connection pooling

## Security Architecture

### Row Level Security (RLS)
- **All Tables**: RLS policies enabled by default
- **User Context**: Automatic user filtering through Supabase Auth
- **Cache Keys**: User-scoped with regex pattern matching
- **Admin Operations**: Service role key bypasses RLS (development only)

### Security Layers
1. **Authentication**: Supabase Auth with cookie-based sessions
2. **Authorization**: RLS policies at database level
3. **Input Validation**: Zod schemas for all inputs
4. **File Security**: Type/size validation and secure storage
5. **Rate Limiting**: PostgreSQL-based sliding window

## Performance & Scaling Architecture

### Caching Strategy
- **PostgreSQL Cache**: JSONB cache table with TTL (no Redis)
- **Vector Search**: pgvector with result caching
- **Connection Pooling**: Enhanced database service with pooling
- **Edge Optimization**: Next.js Edge Runtime where appropriate

### Background Job Pattern
```typescript
1. Server Action creates task record in PostgreSQL
2. Async operation executes with generous Vercel timeouts
3. Client polls task status OR subscribes via SSE
4. Results stored and cache invalidated appropriately
```

## Development Workflow Integration

### File-Based Configuration
- **Environment**: `.env` with comprehensive variable documentation
- **Database**: `drizzle.config.ts` for ORM configuration
- **Next.js**: `next.config.ts` with production optimizations
- **TypeScript**: Strict configuration with path aliases

### Testing Architecture
- **Unit Tests**: Jest for individual functions and services
- **Integration Tests**: Database operations and API endpoints
- **E2E Tests**: Playwright for complete user workflows
- **Security Tests**: Authentication and RLS policy validation

This architecture provides a solid foundation for the AI job hunting agent while maintaining security, performance, and developer productivity.