-- Database Optimization Script
-- Indexes for performance improvements and security

-- Sessions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id_created_at
ON sessions(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id_completed_at
ON sessions(user_id) WHERE completed_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_created_at
ON sessions(created_at DESC);

-- Documents table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_id_type
ON documents(user_id, document_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_id_created_at
ON documents(user_id, created_at DESC);

-- Interview questions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_questions_user_id_session_id
ON interview_questions(user_id, session_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_interview_questions_user_id_answered
ON interview_questions(user_id) WHERE user_answer IS NOT NULL;

-- Cover letters table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cover_letters_user_id_created_at
ON cover_letters(user_id, created_at DESC);

-- Rate limiting table indexes (important for security)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_identifier_created_at
ON rate_limits(identifier, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_created_at
ON rate_limits(created_at);

-- Skill gaps table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skill_gaps_user_id_timeline
ON skill_gaps(user_id, timeline_category, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skill_gaps_session_id
ON skill_gaps(session_id);

-- Tasks table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_session_id_status
ON tasks(session_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_at
ON tasks(created_at DESC);

-- CV embeddings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cv_embeddings_user_id
ON cv_embeddings(user_id);

-- Messages table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_session_id_created_at
ON messages(session_id, created_at DESC);

-- Job descriptions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_descriptions_user_id_created_at
ON job_descriptions(user_id, created_at DESC);

-- Cache table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_key_expires_at
ON cache(key, expires_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_user_id
ON cache(key) WHERE key LIKE 'user:%';

-- RLS Policy Optimization
-- Ensure indexes support RLS policy predicates

-- For rate limiting RLS (uses regex on key)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_rate_limit_keys
ON cache(key) WHERE key ~ '^rate_limit_';

-- For user-specific cache access
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_user_keys
ON cache(key) WHERE key LIKE 'user:%';

-- Cleanup old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- Uncomment the line below if pg_cron is installed
-- SELECT cron.schedule('cleanup-rate-limits', '0 */6 * * *', 'SELECT cleanup_old_rate_limits();');

-- Statistics update for better query planning
ANALYZE sessions;
ANALYZE documents;
ANALYZE interview_questions;
ANALYZE cover_letters;
ANALYZE rate_limits;
ANALYZE skill_gaps;
ANALYZE tasks;
ANALYZE cv_embeddings;
ANALYZE messages;
ANALYZE job_descriptions;
ANALYZE cache;