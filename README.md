# AI Job Hunt Agent

An AI-powered job hunting assistant built with Next.js 16, LangGraph.js, and Supabase. Features CV analysis, cover letter generation, interview preparation, and skill gap analysis with a human-in-the-loop approach.

## Features

- 📄 **CV Analysis**: AI-powered CV analysis with improvement suggestions
- ✉️ **Cover Letter Generation**: Personalized cover letters from CV + job description
- 🎯 **Interview Preparation**: Mock questions and answer evaluation
- 📊 **Document Management**: Upload and manage CVs and job descriptions
- 📈 **Skill Gap Analysis**: Identify missing skills and get personalized learning roadmaps
- 🔒 **Privacy-First**: No automatic job applications
- 👤 **Human-in-the-Loop**: All CV changes require explicit user approval

## Tech Stack

- **Frontend**: Next.js 16 with React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage), LangGraph.js, LangChain
- **AI**: OpenRouter (LLM), OpenAI (embeddings)
- **Database**: PostgreSQL with pgvector for vector embeddings
- **UI**: shadcn/ui components with Radix UI

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account with pgvector extension enabled
- OpenRouter API key
- OpenAI API key
- Supabase MCP tools (for database setup - see instructions below)

### Installation

1. Clone the repository
   ```bash
   git clone <your-repo-url>
   cd ai-job-hunt-agent
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and Supabase credentials
   ```

4. Set up the database

   **Option A: Automated Setup with MCP (Easiest)**
   ```bash
   ./scripts/setup-database.sh
   ```
   *Requires Supabase MCP tools to be configured*

   **Option B: Automated Setup without MCP**
   ```bash
   # Using psql (requires PostgreSQL client tools)
   ./scripts/setup-database-sql.sh

   # Or manually with environment variables
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ./scripts/setup-database-sql.sh
   ```

   **Option C: Supabase Dashboard (Visual)**
   1. Go to your Supabase project dashboard
   2. Open the SQL Editor
   3. Copy and paste the contents of `scripts/database-schema.sql`
   4. Run the script

   **Option D: Traditional Drizzle Setup**
   ```bash
   npm run db:push  # May have connection issues
   npm run db:apply-rls  # Apply Row Level Security policies
   ```

5. Apply Row Level Security (Required)

   **Step 5a: Apply RLS policies (Required for user access)**
   ```bash
   npm run db:apply-rls  # Apply RLS policies
   ```

   **Alternative RLS application methods:**
   - Supabase SQL Editor with `scripts/rls-policies.sql`
   - Direct SQL: `psql $DATABASE_URL -f scripts/rls-policies.sql`

   > **⚠️ Important**: RLS policies are **required** for the application to work. Users will get "Tenant or user not found" errors without proper RLS policies.

6. Run the development server
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Troubleshooting

### "Tenant or user not found" Error

This error occurs when there's a mismatch between Supabase Auth users and your application's users table. Fix it with:

```bash
# Quick fix (recommended)
npm run db:apply-rls && npm run db:fix-all-rls

# Manual fix via SQL Editor
# 1. Open Supabase Dashboard → SQL Editor
# 2. Run: scripts/supabase-auth-user-sync.sql
```

**Root Cause**: Supabase Auth creates users in `auth.users` table, but your app queries `public.users`. The sync script creates automatic sync between both tables.

### Database Connection Issues

See [DATABASE_FIX.md](./DATABASE_FIX.md) for comprehensive troubleshooting of connection problems.

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Architecture overview and development guide
- **[TESTING.md](./TESTING.md)** - Comprehensive testing workflows
- **[DATABASE_FIX.md](./DATABASE_FIX.md)** - Database setup troubleshooting and solutions
- **[spec-nextjs.md](./spec-nextjs.md)** - Detailed technical specifications

## Database Commands

```bash
# Database Setup Commands (Choose one)
./scripts/setup-database.sh      # Automated setup with MCP (easiest)
./scripts/setup-database-sql.sh   # Automated setup without MCP
npm run db:push                   # Traditional Drizzle setup (may have issues)

# RLS Policies (Required after setup)
npm run db:apply-rls              # Apply RLS policies (recommended)
# Or manually: psql $DATABASE_URL -f scripts/rls-policies.sql

# Management Commands
npm run db:generate              # Generate migration files
npm run db:studio                # Open Drizzle Studio
npm run db:cleanup               # Clean database
npm run db:migrate               # Run database migrations
npm run db:fix-all-rls           # Fix all RLS policies
```

### Database Setup Troubleshooting

If you encounter connection issues with `npm run db:push`, you have multiple alternatives:

1. **MCP-Free Script**: Use `./scripts/setup-database-sql.sh` (requires psql)
2. **Supabase Dashboard**: Copy `scripts/database-schema.sql` to the SQL Editor
3. **Manual Setup**: See [DATABASE_FIX.md](./DATABASE_FIX.md) for detailed troubleshooting

**Prerequisites for Different Methods:**
- **MCP Script**: Supabase MCP tools configured
- **SQL Script**: PostgreSQL client tools (`psql`) installed
- **Supabase Dashboard**: Web browser and Supabase account
- **Drizzle**: Working database connection (may have network issues)

## Database Schema

The application uses 15 tables with the following key features:
- **Vector embeddings** for CV and job description analysis (1536 dimensions)
- **Row Level Security (RLS)** for multi-tenant data isolation
- **JSONB storage** for flexible metadata and content
- **UUID primary keys** for security and scalability
- **Comprehensive audit trails** with created/updated timestamps

## Architecture Overview

- **Multi-Agent System**: LangGraph.js orchestrates specialized AI agents
- **Privacy-First**: No automatic job applications or email sending
- **Human-in-the-Loop**: All CV modifications require user approval
- **Document Processing**: Automatic parsing of PDF, DOCX, and TXT files
- **Real-time Updates**: Server-Sent Events for long-running operations

## License

MIT
