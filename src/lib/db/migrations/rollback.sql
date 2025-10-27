-- Rollback Script: Drop all tables created by migration 0000_flimsy_slyde.sql
-- WARNING: This will delete all data in these tables!
-- Run this in Supabase SQL Editor to remove the migration

-- Drop all foreign key constraints first by dropping tables in reverse dependency order
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

-- Verify all tables are dropped
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'sessions', 'documents', 'messages',
    'cv_embeddings', 'job_descriptions', 'tasks',
    'cache', 'rate_limits', 'approvals', 'skill_gaps',
    'user_metrics', 'llm_calls', 'interview_questions', 'cover_letters'
  );
-- This should return 0 rows after rollback

-- Optional: If you also want to remove the vector extension
-- (Only do this if you're sure no other tables use it)
-- DROP EXTENSION IF EXISTS vector CASCADE;
