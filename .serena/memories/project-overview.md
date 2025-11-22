# AI Job Hunt Agent - Project Overview

## Project Purpose
AI-powered job hunting assistant built with Next.js 16, LangChain.js, and Supabase. Features CV analysis, cover letter generation, interview preparation, and skill gap analysis with a human-in-the-loop approach.

## Core Features
- 📄 **CV Analysis**: AI-powered CV analysis with improvement suggestions
- ✉️ **Cover Letter Generation**: Personalized cover letters from CV + job description
- 🎯 **Interview Preparation**: Mock questions and answer evaluation
- 📊 **Document Management**: Upload and manage CVs and job descriptions
- 📈 **Skill Gap Analysis**: Identify missing skills and get personalized learning roadmaps
- 👤 **Human-in-the-Loop**: All CV changes require explicit user approval

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with React 19.2.0
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **UI Components**: Radix UI primitives
- **State Management**: Server Components + Server Actions

### Backend
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **Authentication**: Supabase Auth with cookie-based sessions
- **File Storage**: Supabase Storage (S3-compatible)
- **ORM**: Drizzle ORM for type-safe database access
- **AI/LLM**: 
  - OpenRouter (GPT-5-nano) for main LLM operations
  - OpenAI (text-embedding-3-small) for embeddings
  - LangChain.js for agent orchestration

### Infrastructure
- **Deployment**: Vercel (optimized for Next.js)
- **Database**: PostgreSQL with pgvector for vector embeddings
- **Caching**: PostgreSQL table with JSONB values (no Redis)
- **Background Jobs**: Server Actions + PostgreSQL task tracking (no Inngest)
- **Rate Limiting**: PostgreSQL-based sliding window

## Architecture Principles
- **Privacy-first**: No automatic job applications or email sending
- **Human-in-the-loop**: All CV modifications require user approval
- **Supabase-only**: Single data layer solution using PostgreSQL, Storage, and Auth
- **Row Level Security (RLS)**: All database operations respect user context
- **Multi-Agent System**: Specialized AI agents for different tasks

## Database Schema
15 tables with key features:
- Vector embeddings for CV and job description analysis (1536 dimensions)
- Row Level Security (RLS) for multi-tenant data isolation
- JSONB storage for flexible metadata and content
- UUID primary keys for security and scalability
- Comprehensive audit trails with created/updated timestamps

## Key Services
- Document parsing (PDF, DOCX, TXT) with automatic content extraction
- Vector search service with caching for similarity matching
- Enhanced database service with connection pooling
- Cache service with RLS-aware user-scoped keys
- Multiple specialized AI agents (CV, Interview, Cover Letter, Skill Gap)

## Security Features
- Row Level Security (RLS) policies on all tables
- User-scoped cache keys with regex pattern matching
- Server-side authentication with proper user context
- Input validation and sanitization
- Secure file upload with permission handling