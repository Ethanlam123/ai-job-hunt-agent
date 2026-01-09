# Developer Guide

Quick reference for developers working on this project.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 + React 19 |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Next.js Server Actions |
| Database | Supabase + PostgreSQL |
| AI/ML | LangChain.js |
| Vector DB | pgvector |

## Quick Start

```bash
# Install
npm install

# Setup database
./scripts/setup-database.sh

# Dev server
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

## Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
│   └── ui/          # shadcn/ui base components
├── lib/
│   ├── agents/      # AI agents (CV, interview, skill gap)
│   ├── services/    # Business logic
│   ├── utils/       # Helper functions
│   └── types/       # TypeScript types
└── actions/         # Server Actions
```

## Key Patterns

### Server Actions
All mutations use Server Actions (`'use server'`):
```typescript
// actions/documents.ts
export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()
  // ... logic
  return { success: true, document }
}
```

### Document Types
Use shared types from `@/lib/types`:
```typescript
import type { Document, DocumentType } from '@/lib/types'
```

### Database Access
Use Drizzle ORM for type-safe queries:
```typescript
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
await db.select().from(documents).where(eq(documents.id, id))
```

## Coding Standards

- **No emoji** in code
- Use **hyphens** (`-`) not em dashes (`—`)
- Prefer **Server Components** over Client Components
- Use **explicit types** for function signatures
- Follow **conventional commits** for messages

## Database

| Command | Purpose |
|---------|---------|
| `npm run db:push` | Push schema changes |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:cleanup` | Clear all data |
| `npm run db:apply-rls` | Apply RLS policies |

## Testing

```bash
npm run test              # All tests
npm run test:e2e          # End-to-end tests
npm run test:integration  # Integration tests
npm run test:security     # Security tests
```

## AI Agents

All agents follow this pattern:
1. Parse input (CV/JD)
2. Call LLM via LangChain
3. Store results in database
4. Return structured response

Files:
- `src/lib/agents/cv-agent.ts`
- `src/lib/agents/interview-agent.ts`
- `src/lib/agents/skill-gap-agent.ts`

## Common Tasks

### Add a new feature
1. Create route in `src/app/(dashboard)/`
2. Add Server Action in `src/actions/`
3. Create components in `src/components/`
4. Update types in `src/lib/types/`

### Add a new AI agent
1. Create file in `src/lib/agents/`
2. Extend base pattern from existing agents
3. Add prompts in `src/lib/prompts/`
4. Wire up via Server Action

### Database schema change
1. Update `src/lib/db/schema.ts`
2. Run `npm run db:push`
3. Update TypeScript types if needed

## Environment Variables

Required (see `.env.example`):
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
DATABASE_URL=
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Dev server won't start | Delete `.next` and restart |
| Database errors | Check RLS policies are applied |
| LLM errors | Verify API keys are set |
| Type errors | Run `npm run type-check` |
