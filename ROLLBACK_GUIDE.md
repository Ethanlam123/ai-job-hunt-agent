# Database Rollback Guide

This guide explains how to remove the database tables created by the migration.

## ⚠️ WARNING

**This will permanently delete all data in these tables!** Make sure you want to proceed before running these commands.

---

## Option 1: Drop Tables via Supabase Dashboard (Recommended)

This is the safest method for removing tables.

### Steps:

1. **Go to Supabase Dashboard**
   - Open your project at https://supabase.com/dashboard
   - Navigate to **SQL Editor**

2. **Copy and Execute Rollback Script**
   - Open the file: `src/lib/db/migrations/rollback.sql`
   - Copy all the SQL content
   - Paste into the SQL Editor
   - Click **Run**

3. **Verify Tables are Removed**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   The following tables should **NOT** appear:
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

---

## Option 2: Quick Rollback (One Command)

Execute this single command in Supabase SQL Editor:

```sql
DROP TABLE IF EXISTS
  user_metrics,
  llm_calls,
  skill_gaps,
  interview_questions,
  cover_letters,
  approvals,
  tasks,
  cv_embeddings,
  job_descriptions,
  messages,
  documents,
  sessions,
  rate_limits,
  cache,
  users
CASCADE;
```

The `CASCADE` option will automatically drop dependent objects (foreign keys).

---

## Option 3: Remove Specific Tables Only

If you only want to remove certain tables, drop them individually:

```sql
-- Example: Drop only test-related tables
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS llm_calls CASCADE;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

---

## Option 4: Using Drizzle Studio

1. **Open Drizzle Studio:**
   ```bash
   npm run db:studio
   ```

2. Navigate to each table in the UI

3. Use the "Drop Table" option for each table

---

## After Rollback: Clean Up Migration Files (Optional)

If you want to start fresh with new migrations:

```bash
# Remove migration files
rm -rf src/lib/db/migrations/*

# Regenerate migrations
npm run db:generate
```

---

## Rollback Checklist

- [ ] **Backup important data** (if any exists)
- [ ] **Confirm you want to delete all data**
- [ ] **Run rollback SQL in Supabase Dashboard**
- [ ] **Verify tables are removed**
- [ ] **Check for any dependent objects** (triggers, functions, views)
- [ ] **Optionally remove migration files**
- [ ] **Optionally regenerate migrations** if schema changed

---

## Common Issues

### "relation does not exist" error

This means the table was never created. No action needed.

### Foreign key constraint errors

The `CASCADE` option should handle this, but if you get errors:

```sql
-- Drop tables in this specific order:
DROP TABLE IF EXISTS user_metrics CASCADE;
DROP TABLE IF EXISTS llm_calls CASCADE;
DROP TABLE IF EXISTS skill_gaps CASCADE;
DROP TABLE IF EXISTS interview_questions CASCADE;
DROP TABLE IF EXISTS cover_letters CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS cv_embeddings CASCADE;
DROP TABLE IF EXISTS job_descriptions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS cache CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### Permission denied

Make sure you're using the correct Supabase credentials with database access.

---

## Re-running Migrations After Rollback

After rollback, you can re-apply migrations:

```bash
# Push schema again
npm run db:push
```

Or manually execute `0000_flimsy_slyde.sql` in Supabase Dashboard.

---

## Keeping Vector Extension

The rollback script does NOT remove the pgvector extension by default. If you want to remove it:

```sql
-- WARNING: Only run if no other tables use vector type
DROP EXTENSION IF EXISTS vector CASCADE;
```

To keep it (recommended for future use):
```sql
-- Verify it's still there
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Need Help?

If you encounter issues:

1. Check the Supabase logs in Dashboard → Database → Logs
2. Verify your database connection
3. Ensure you have proper permissions
4. Try the tables one at a time instead of all at once

---

## Quick Reference

```sql
-- Check what tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Drop all migration tables
DROP TABLE IF EXISTS user_metrics, llm_calls, skill_gaps, interview_questions,
  cover_letters, approvals, tasks, cv_embeddings, job_descriptions, messages,
  documents, sessions, rate_limits, cache, users CASCADE;

-- Verify clean state
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
```
