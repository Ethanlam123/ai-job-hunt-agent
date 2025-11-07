-- =============================================================================
-- Row Level Security (RLS) Policies for AI Job Hunt Agent
-- =============================================================================
-- This script applies comprehensive RLS policies to ensure users can only
-- access their own data while allowing proper application functionality.
--
-- Usage: Apply this script via Supabase SQL Editor or psql
-- Prerequisites: All tables must exist before applying RLS policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
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

-- =============================================================================
-- Users Table Policies
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- Sessions Table Policies
-- =============================================================================

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Messages Table Policies
-- =============================================================================

-- Users can view messages in their own sessions
CREATE POLICY "Users can view own session messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = messages.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can insert messages in their own sessions
CREATE POLICY "Users can insert messages in own sessions" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = messages.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can update messages in their own sessions
CREATE POLICY "Users can update own session messages" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = messages.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Documents Table Policies
-- =============================================================================

-- Users can view their own documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can upload their own documents
CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- CV Embeddings Table Policies
-- =============================================================================

-- Users can view their own CV embeddings
CREATE POLICY "Users can view own cv embeddings" ON cv_embeddings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own CV embeddings
CREATE POLICY "Users can insert own cv embeddings" ON cv_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own CV embeddings
CREATE POLICY "Users can update own cv embeddings" ON cv_embeddings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own CV embeddings
CREATE POLICY "Users can delete own cv embeddings" ON cv_embeddings
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Job Descriptions Table Policies
-- =============================================================================

-- Users can view their own job descriptions
CREATE POLICY "Users can view own job descriptions" ON job_descriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own job descriptions
CREATE POLICY "Users can insert own job descriptions" ON job_descriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own job descriptions
CREATE POLICY "Users can update own job descriptions" ON job_descriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own job descriptions
CREATE POLICY "Users can delete own job descriptions" ON job_descriptions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Tasks Table Policies
-- =============================================================================

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own tasks
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Cache Table Policies
-- =============================================================================

-- Public read access for cache (shared cache entries)
CREATE POLICY "Public can read cache" ON cache
  FOR SELECT USING (
    key LIKE 'public:%' OR
    key LIKE 'user:' || auth.uid() || ':%'
  );

-- Users can insert cache entries (user-scoped or public)
CREATE POLICY "Users can insert cache entries" ON cache
  FOR INSERT WITH CHECK (
    key LIKE 'user:' || auth.uid() || ':%' OR
    key LIKE 'public:%'
  );

-- Users can update cache entries they own
CREATE POLICY "Users can update own cache entries" ON cache
  FOR UPDATE USING (
    key LIKE 'user:' || auth.uid() || ':%' OR
    key LIKE 'public:%'
  );

-- Users can delete cache entries they own
CREATE POLICY "Users can delete own cache entries" ON cache
  FOR DELETE USING (
    key LIKE 'user:' || auth.uid() || ':%' OR
    key LIKE 'public:%'
  );

-- =============================================================================
-- Rate Limits Table Policies
-- =============================================================================

-- Users can manage their own rate limits
CREATE POLICY "Users can manage own rate limits" ON rate_limits
  FOR ALL USING (auth.uid()::text = identifier);

-- Public read access for rate limits (for system monitoring)
CREATE POLICY "Public rate limits" ON rate_limits
  FOR SELECT USING (true);

-- =============================================================================
-- Approvals Table Policies
-- =============================================================================

-- Users can view their own approvals
CREATE POLICY "Users can view own approvals" ON approvals
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own approvals
CREATE POLICY "Users can insert own approvals" ON approvals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own approvals
CREATE POLICY "Users can update own approvals" ON approvals
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own approvals
CREATE POLICY "Users can delete own approvals" ON approvals
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Skill Gaps Table Policies
-- =============================================================================

-- Users can view their own skill gaps
CREATE POLICY "Users can view own skill gaps" ON skill_gaps
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own skill gaps
CREATE POLICY "Users can insert own skill gaps" ON skill_gaps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own skill gaps
CREATE POLICY "Users can update own skill gaps" ON skill_gaps
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own skill gaps
CREATE POLICY "Users can delete own skill gaps" ON skill_gaps
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- User Metrics Table Policies
-- =============================================================================

-- Users can view their own metrics
CREATE POLICY "Users can view own metrics" ON user_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own metrics
CREATE POLICY "Users can insert own metrics" ON user_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own metrics
CREATE POLICY "Users can update own metrics" ON user_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own metrics
CREATE POLICY "Users can delete own metrics" ON user_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- LLM Calls Table Policies
-- =============================================================================

-- Users can view their own LLM calls
CREATE POLICY "Users can view own llm calls" ON llm_calls
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own LLM calls
CREATE POLICY "Users can insert own llm calls" ON llm_calls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own LLM calls
CREATE POLICY "Users can update own llm calls" ON llm_calls
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own LLM calls
CREATE POLICY "Users can delete own llm calls" ON llm_calls
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Interview Questions Table Policies
-- =============================================================================

-- Users can view their own interview questions
CREATE POLICY "Users can view own interview questions" ON interview_questions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own interview questions
CREATE POLICY "Users can insert own interview questions" ON interview_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own interview questions
CREATE POLICY "Users can update own interview questions" ON interview_questions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own interview questions
CREATE POLICY "Users can delete own interview questions" ON interview_questions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Cover Letters Table Policies
-- =============================================================================

-- Users can view their own cover letters
CREATE POLICY "Users can view own cover letters" ON cover_letters
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own cover letters
CREATE POLICY "Users can insert own cover letters" ON cover_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own cover letters
CREATE POLICY "Users can update own cover letters" ON cover_letters
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own cover letters
CREATE POLICY "Users can delete own cover letters" ON cover_letters
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Verify RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'sessions', 'messages', 'documents', 'cv_embeddings',
        'job_descriptions', 'tasks', 'cache', 'rate_limits', 'approvals',
        'skill_gaps', 'user_metrics', 'llm_calls', 'interview_questions', 'cover_letters'
    )
ORDER BY tablename;

-- Verify policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- Summary
-- =============================================================================
-- Total tables with RLS enabled: 15
-- Total policies created: ~45+ (multiple policies per table)
-- Security model: User isolation with some public cache access
-- =============================================================================