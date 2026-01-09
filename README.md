# AI Job Hunt Agent

AI-powered job hunting assistant with CV analysis, cover letter generation, interview prep, and skill gap analysis.

## Features

- **CV Analysis** - AI-powered improvement suggestions
- **Cover Letter Generation** - Personalized from CV + job description
- **Interview Preparation** - Mock questions with evaluation
- **Skill Gap Analysis** - Learning roadmaps for target roles
- **Document Management** - Upload and reuse CVs and job descriptions

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage), LangChain.js |
| AI | OpenRouter (LLM), OpenAI (embeddings) |
| Database | PostgreSQL with pgvector |
| UI | shadcn/ui components |

## Quick Start

```bash
# Install
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Setup database (easiest method)
./scripts/setup-database.sh

# Start dev server
npm run dev
```

Visit http://localhost:3000

## Environment Variables

Required (see `.env.example`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Database
DATABASE_URL=postgresql://...

# AI Services
OPENROUTER_API_KEY=
OPENAI_API_KEY=
```

Get keys from:
- Supabase: https://supabase.com/dashboard
- OpenRouter: https://openrouter.ai/keys
- OpenAI: https://platform.openai.com/api-keys

## Database Commands

```bash
npm run db:push        # Push schema changes
npm run db:studio      # Open Drizzle Studio
npm run db:cleanup     # Clear all data
npm run db:apply-rls   # Apply RLS policies
npm run db:fix-all-rls # Fix RLS policies
```

## Development

```bash
npm run dev            # Start dev server
npm run build          # Build for production
npm run type-check     # TypeScript check
npm run lint           # ESLint
npm run test           # Run tests
```

## Troubleshooting

### "Tenant or user not found"

Run: `npm run db:apply-rls && npm run db:fix-all-rls`

This syncs `auth.users` with `public.users` table.

### Database connection issues

Use the automated setup script: `./scripts/setup-database.sh`

Or manually via Supabase Dashboard SQL Editor.

## Documentation

- [Developer Guide](./docs/developer/development-guide.md)
- [Architecture](./docs/architecture/system-overview.md)
- [API Reference](./docs/api/server-actions.md)
- [Testing](./docs/testing/comprehensive-testing.md)

## Architecture

- **Multi-Agent System** - Specialized AI agents per feature
- **Human-in-the-Loop** - All CV changes require user approval
- **Document Processing** - Auto-parse PDF, DOCX, TXT
- **Row Level Security** - Multi-tenant data isolation

## License

MIT
