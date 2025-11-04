# Project Context

## Purpose

AI Job Hunt Agent is a comprehensive, privacy-first job hunting assistant that helps job seekers with CV analysis, cover letter generation, interview preparation, and skill gap analysis. The system uses a multi-agent architecture with human-in-the-loop design principles, ensuring users maintain full control over their job application process while receiving AI-powered guidance and optimization suggestions.

**Core Values:**
- **Privacy-First**: No automatic job applications or email sending
- **Human-in-the-Loop**: All CV changes require explicit user approval
- **AI-Powered Assistance**: Intelligent analysis and generation using advanced LLMs
- **Comprehensive Workflow**: End-to-end job hunting support from CV optimization to interview prep

## Tech Stack

### Frontend Technologies
- **Next.js 16** with App Router and React 19.2.0
- **TypeScript** in strict mode with comprehensive type safety
- **Tailwind CSS v4** with custom theme system and shadcn/ui components
- **Radix UI** primitives for accessible component foundations
- **React Hook Form** with Zod validation for form handling
- **Lucide React** for iconography
- **next-themes** for dark/light mode support

### Backend & Data Layer
- **Supabase** as the complete backend solution:
  - PostgreSQL with pgvector extension for vector embeddings
  - Supabase Auth for authentication with cookie-based sessions
  - Supabase Storage for file management (S3-compatible)
  - Row Level Security (RLS) for data access control
- **Drizzle ORM** for type-safe database operations
- **LangGraph.js + LangChain.js** for AI agent orchestration
- **Server Actions** (`'use server'`) for mutations and form handling

### AI & External Services
- **OpenRouter** (GPT-5-nano model) for primary LLM operations
- **OpenAI** (text-embedding-3-small) for vector embeddings
- **Document Processing**: pdf-parse, mammoth for PDF/DOCX parsing
- **LangSmith** for agent tracing and debugging (optional)

### Development & Deployment
- **Vercel** as the primary deployment platform
- **ESLint** with Next.js configuration for code quality
- **TypeScript** compiler with strict type checking
- **Drizzle Kit** for database migrations and management

## Project Conventions

### Code Style
- **TypeScript Strict Mode**: All code must pass strict type checking
- **Component Architecture**: Default to Server Components, use Client Components only when necessary for interactivity
- **Import Aliases**: Use `@/*` path aliases for all internal imports
- **Naming Conventions**:
  - Components: PascalCase with descriptive names
  - Functions: camelCase with verb-first naming
  - Constants: UPPER_SNAKE_CASE for exports
  - Files: kebab-case for most files, PascalCase for components

### Architecture Patterns

**Server-First Approach:**
- Default to Server Components for better performance and security
- Use Client Components (`'use client'`) only when interactive features are needed
- Implement Server Actions for all mutations and form submissions

**Multi-Agent Architecture:**
- Specialized agents for different tasks (CV, Interview, Cover Letter, Skill Gap)
- Orchestrator agent manages workflow state and agent coordination
- Agents communicate via LangGraph state channels

**Data Access Patterns:**
- Row Level Security (RLS) enforced at database level
- User-scoped cache keys: `user:{userId}:{key}`
- Service layer abstraction for business logic
- Type-safe database operations with Drizzle ORM

**Document Management:**
- Automatic parsing and content extraction for all uploads
- Support for PDF, DOCX, and TXT file formats
- Parsed content stored as structured JSON with metadata
- Document reuse across different features

### Testing Strategy

**Manual Testing Workflow:**
- Comprehensive testing documented in `TESTING.md`
- Focus on end-to-end user workflows
- Document upload/management verification
- Agent interaction testing with real AI responses
- Database RLS policy validation

**Quality Assurance:**
- TypeScript compilation for type safety
- ESLint for code quality and consistency
- Database schema validation through Drizzle
- Environment variable validation

### Git Workflow

**Branching Strategy:**
- `main` branch for production-ready code
- Feature branches for new development
- Descriptive commit messages following conventional format

**Commit Conventions:**
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- Include specific descriptions of changes made

## Domain Context

**Job Hunting Workflow:**
The application supports the complete job hunting journey:
1. **Document Management**: Upload and organize CVs and job descriptions
2. **CV Analysis**: AI-powered analysis with improvement suggestions
3. **Skill Gap Analysis**: Compare CV skills against job requirements
4. **Cover Letter Generation**: Personalized letters from CV + job description
5. **Interview Preparation**: Mock questions and feedback

**AI Agent System:**
- **Orchestrator Agent**: Routes requests and manages workflow state
- **CV Agent**: Analyzes and suggests CV improvements
- **Interview Agent**: Generates questions and evaluates responses
- **Cover Letter Agent**: Creates personalized cover letters
- **Skill Gap Agent**: Identifies missing skills and learning roadmaps

**Document Processing Pipeline:**
- Automatic text extraction and parsing
- Content structure analysis for CVs and job descriptions
- Vector embeddings for semantic search and comparison
- Metadata extraction (word count, page count, sections)

## Important Constraints

**Security Requirements:**
- Row Level Security (RLS) must be enforced for all database operations
- `SUPABASE_SERVICE_ROLE_KEY` only for development/admin tasks
- User authentication required for all protected routes
- Input validation using Zod schemas

**Privacy Constraints:**
- No automatic job applications or external communications
- User approval required for all CV modifications
- Data isolation between users enforced at database level
- Optional user data deletion capabilities

**Technical Constraints:**
- Supabase-only data layer (no Redis, Inngest, or external databases)
- Serverless deployment compatibility (Vercel functions)
- PostgreSQL-based caching and rate limiting
- File size limits for document uploads

**Business Constraints:**
- Human-in-the-loop design for all critical decisions
- No integration with job boards or application systems
- Focus on guidance and optimization rather than automation

## External Dependencies

**Required Services:**
- **Supabase**: Database, auth, storage, and real-time features
- **OpenRouter**: Primary LLM service (GPT-5-nano)
- **OpenAI**: Embeddings for vector search

**Optional Services:**
- **LangSmith**: Agent tracing and debugging
- **TAVILY**: Web search capabilities

**Development Dependencies:**
- **Node.js 18+**: Runtime environment
- **PostgreSQL**: Database with pgvector extension
- **Drizzle Kit**: Database migration tools

**File Processing Libraries:**
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX document processing
- **pgvector**: Vector similarity search in PostgreSQL
