# Database Migration Guide

This guide explains how to set up and migrate the database schema to your Supabase instance.

## Prerequisites

- Supabase project created
- Database credentials (available in Supabase dashboard)
- Node.js and npm installed

## Step 1: Enable pgvector Extension

Before running migrations, you need to enable the pgvector extension for vector embeddings.

### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Via CLI (if you have direct access)

```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Step 2: Configure Environment Variables

Ensure your `.env` file has the correct database connection string:

```bash
# Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

# Database URL (Direct connection)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# Alternative: Use connection pooling (more reliable for some networks)
# DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:6543/postgres?pgbouncer=true
```

## Step 3: Run Database Migrations

### Option A: Using Drizzle Kit Push (Recommended for Development)

```bash
npm run db:push
```

This will:
- Connect to your Supabase database
- Compare your schema with the database
- Apply all changes automatically

### Option B: Manual SQL Execution (If push fails)

If `db:push` encounters network issues (like IPv6 connectivity problems), you can manually execute the migration:

1. Open the migration file: `src/lib/db/migrations/0000_flimsy_slyde.sql`

2. Copy the entire SQL content

3. Go to Supabase Dashboard → **SQL Editor**

4. Paste and execute the SQL

5. Verify all tables were created:

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- approvals
- cache
- cover_letters
- cv_embeddings
- documents
- interview_questions
- job_descriptions
- llm_calls
- messages
- rate_limits
- sessions
- skill_gaps
- tasks
- user_metrics
- users

## Step 4: Set Up Row Level Security (RLS)

For production, you MUST enable RLS on all tables. Here's a starter template:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;

-- Example RLS policies for documents table
-- Users can only access their own documents
CREATE POLICY "Users can view own documents"
  ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Repeat similar policies for other tables
-- Cache table: Users can only access cache keys prefixed with user:{userId}:
CREATE POLICY "Users can access own cache"
  ON cache
  FOR ALL
  USING (
    key LIKE 'public:%' OR
    key LIKE CONCAT('user:', auth.uid()::text, ':%')
  );
```

## Step 5: Create Supabase Storage Bucket

The application uses Supabase Storage for file uploads:

```sql
-- Create documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Set up storage policies
CREATE POLICY "Users can upload own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 6: Verify Migration

Run these SQL queries to verify your setup:

```sql
-- Check table count
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
-- Expected: 15 tables

-- Check vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Should return 1 row

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- All should have rowsecurity = true

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'documents';
-- Should return 1 row
```

## Step 7: Sync Users Table with Supabase Auth

The `users` table references Supabase Auth but needs to be populated. Create a trigger:

```sql
-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT id, email, created_at, created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

## Troubleshooting

### IPv6 Connection Issues

If `npm run db:push` fails with `EHOSTUNREACH`, try:

1. Use the connection pooling URL (port 6543) in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:6543/postgres?pgbouncer=true
   ```

2. Or manually execute the SQL file in Supabase Dashboard

### Vector Extension Not Found

If you get "type vector does not exist":

1. Ensure pgvector extension is enabled
2. Run: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Restart your database connection

### Permission Denied Errors

If you get permission errors:

1. Check your database password is correct
2. Ensure you're using the correct DATABASE_URL
3. Verify your Supabase project is active

## Drizzle Kit Commands Reference

```bash
# Generate new migration after schema changes
npm run db:generate

# Push schema to database (development)
npm run db:push

# Run migrations (production)
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Next Steps

After successful migration:

1. Test database connectivity from your app
2. Test file upload to Supabase Storage
3. Verify RLS policies work as expected
4. Set up monitoring and backups
5. Configure production environment variables

## Need Help?

- Check Supabase documentation: https://supabase.com/docs
- Drizzle ORM docs: https://orm.drizzle.team/
- pgvector extension: https://github.com/pgvector/pgvector
