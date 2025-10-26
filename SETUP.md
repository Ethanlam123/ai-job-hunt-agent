# Foundation Setup Guide

This guide explains how to set up and run the Job Hunt Agent foundation implementation.

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- PostgreSQL database with pgvector extension enabled

## Environment Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your environment variables in `.env`:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Database (for Drizzle ORM - get from Supabase Settings > Database > Connection string)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

   # Optional: OpenRouter and OpenAI (not needed for foundation phase)
   # OPENROUTER_API_KEY=your_openrouter_api_key
   # OPENAI_API_KEY=your_openai_api_key
   ```

## Supabase Setup

### 1. Enable pgvector Extension

In your Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create Storage Bucket

In Supabase Dashboard, go to Storage and create a new bucket:
- Name: `documents`
- Public: No (private)

### 3. Set up Row Level Security (RLS) Policies

The database schema includes tables that need RLS policies. You can either:

**Option A: Use Drizzle migrations (Recommended)**
```bash
npm run db:generate
npm run db:push
```

Then manually add RLS policies in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Sessions: Users can only access their own sessions
CREATE POLICY "Users can manage their own sessions"
  ON sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages: Users can only access messages from their sessions
CREATE POLICY "Users can manage their own messages"
  ON messages
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Documents: Users can only access their own documents
CREATE POLICY "Users can manage their own documents"
  ON documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- CV Embeddings: Users can only access their own embeddings
CREATE POLICY "Users can manage their own embeddings"
  ON cv_embeddings
  FOR ALL
  USING (auth.uid()::text = user_id::text);

-- Job Descriptions: Users can only access their own job descriptions
CREATE POLICY "Users can manage their own job descriptions"
  ON job_descriptions
  FOR ALL
  USING (auth.uid()::text = user_id::text);

-- Tasks: Users can only access tasks from their sessions
CREATE POLICY "Users can manage their own tasks"
  ON tasks
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

-- Cache: Users can access their own cache entries
CREATE POLICY "Users can manage their own cache"
  ON cache
  FOR ALL
  USING (auth.uid()::text = substring(key from 'user:([^:]+)'))
  WITH CHECK (auth.uid()::text = substring(key from 'user:([^:]+)'));

-- Cache: Public cache access
CREATE POLICY "Public cache access"
  ON cache
  FOR SELECT
  USING (key LIKE 'public:%');

-- Rate Limits: Anyone can check rate limits
CREATE POLICY "Anyone can check rate limits"
  ON rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

**Option B: Use Supabase Dashboard**
Go to Database > Tables and create each table manually using the schema from `src/lib/db/schema.ts`.

### 4. Set up Storage RLS Policies

In Supabase SQL Editor:

```sql
-- Documents storage bucket policies
CREATE POLICY "Users can upload their own documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

## Installation

Install dependencies:

```bash
npm install
```

## Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features Implemented

### Phase 1: Foundation ✅

- [x] Next.js 16 project setup with App Router
- [x] Supabase integration (Auth + Database + Storage)
- [x] shadcn/ui setup with core components
- [x] Authentication pages (login/register with Server Actions)
- [x] Basic layout (Navbar, Dashboard with navigation)
- [x] Database schema & Drizzle ORM configuration
- [x] File upload functionality with Supabase Storage
- [x] Row Level Security (RLS) for all tables
- [x] Middleware for protected routes

## Project Structure

```
src/
├── actions/              # Server Actions
│   ├── auth.ts          # Authentication actions
│   └── documents.ts     # Document upload/delete actions
├── app/                 # Next.js App Router
│   ├── (auth)/         # Auth route group
│   │   ├── login/      # Login page
│   │   └── register/   # Registration page
│   ├── (dashboard)/    # Protected route group
│   │   ├── dashboard/  # Main dashboard
│   │   ├── workflow/   # Workflow page (placeholder)
│   │   ├── history/    # History page (placeholder)
│   │   ├── profile/    # Profile page
│   │   └── upload/     # Upload test page
│   ├── layout.tsx      # Root layout with Toaster
│   └── page.tsx        # Landing page
├── components/
│   ├── auth/           # Authentication forms
│   ├── layout/         # Layout components (Navbar)
│   ├── ui/             # shadcn/ui components
│   └── upload/         # File upload components
├── lib/
│   ├── db/             # Database
│   │   ├── schema.ts   # Drizzle schema
│   │   └── index.ts    # Database client
│   ├── supabase/       # Supabase utilities
│   │   ├── client.ts   # Browser client
│   │   ├── server.ts   # Server client
│   │   └── middleware.ts # Auth middleware
│   ├── types/          # TypeScript types
│   └── utils.ts        # Utility functions
└── middleware.ts       # Next.js middleware
```

## Testing the Foundation

1. **Authentication Flow**:
   - Go to http://localhost:3000
   - Click "Get Started" or "Sign Up"
   - Create an account with email and password
   - You'll be redirected to the dashboard

2. **Dashboard**:
   - View the welcome message with your email
   - See cards for different features (CV Analysis, Cover Letter, etc.)
   - All navigation links work (Dashboard, Workflow, History)

3. **File Upload**:
   - Go to http://localhost:3000/upload
   - Test uploading a PDF, DOCX, or TXT file
   - Files should upload to Supabase Storage
   - Check Supabase Dashboard > Storage > documents to verify

4. **Profile**:
   - Go to http://localhost:3000/profile
   - View your account information

5. **Sign Out**:
   - Click "Sign out" in the navbar
   - You'll be redirected to the login page

## Database Commands

```bash
# Generate migration files from schema
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly to database (for development)
npm run db:push

# Open Drizzle Studio to view database
npm run db:studio
```

## Troubleshooting

### Database Connection Issues

If you get database connection errors:
1. Verify your `DATABASE_URL` is correct in `.env`
2. Ensure your Supabase project is active
3. Check that pgvector extension is enabled

### File Upload Issues

If file uploads fail:
1. Verify the `documents` storage bucket exists
2. Check that storage RLS policies are set up
3. Ensure user is authenticated

### Authentication Issues

If auth doesn't work:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
2. Check Supabase Dashboard > Authentication > Settings
3. Ensure email confirmations are disabled for development (or use a real email)

## Next Steps

After completing the foundation setup, you can proceed to:
- **Phase 2**: CV Agent implementation
- **Phase 3**: Additional agents (Cover Letter, Interview, Skill Gap)
- **Phase 4**: Polish and deployment

See `spec-nextjs.md` for detailed implementation plans for each phase.
