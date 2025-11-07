-- =============================================================================
-- Database Schema for AI Job Hunt Agent
-- =============================================================================
-- This file contains the complete SQL schema for the application.
-- Use this with the Supabase SQL Editor or psql command line tool.
--
-- Prerequisites:
-- - PostgreSQL with pgvector extension enabled
-- - UUID extension (uuid-ossp) enabled
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- Table Definitions
-- =============================================================================

-- Users table (managed by Supabase Auth but we need it for relationships)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table - tracks user workflow sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_stage VARCHAR(50),
  state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Messages table - chat messages with agent responses
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table - uploaded CVs and JDs
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  document_type VARCHAR(50), -- 'cv' | 'jd' | 'cover_letter'
  original_filename VARCHAR(255),
  file_path VARCHAR(500),
  file_format VARCHAR(10), -- 'pdf' | 'docx' | 'txt'
  parsed_content JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CV Embeddings table - vector embeddings for CV sections
CREATE TABLE IF NOT EXISTS cv_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  section_type VARCHAR(50), -- 'experience' | 'education' | 'skills' | etc.
  content TEXT,
  embedding vector(1536), -- OpenRouter embeddings (1536 dimensions)
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Descriptions table
CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  description TEXT,
  requirements JSONB,
  parsed_content JSONB,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table - background job tracking
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL, -- 'cv_analysis' | 'cover_letter' | etc.
  status VARCHAR(20) NOT NULL, -- 'processing' | 'completed' | 'failed'
  result JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Cache table - PostgreSQL-based caching
CREATE TABLE IF NOT EXISTS cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limits table - PostgreSQL-based rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approvals table - tracks CV change approvals (human-in-the-loop)
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL, -- 'cv_edit' | 'section_add' | etc.
  original_content JSONB,
  proposed_content JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  decided_at TIMESTAMP WITH TIME ZONE
);

-- Skill gaps table - identifies missing skills from CV vs JD comparison
CREATE TABLE IF NOT EXISTS skill_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'technical' | 'soft' | etc.
  importance VARCHAR(20), -- 'critical' | 'important' | 'nice-to-have'
  learning_resources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User metrics table - tracks usage statistics
CREATE TABLE IF NOT EXISTS user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- 'cv_analysis' | 'interview_count' | etc.
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM calls table - tracks LLM API usage for monitoring and cost control
CREATE TABLE IF NOT EXISTS llm_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'openrouter' | 'openai'
  prompt_tokens VARCHAR(20),
  completion_tokens VARCHAR(20),
  total_tokens VARCHAR(20),
  cost JSONB, -- { amount: number, currency: string }
  duration VARCHAR(20), -- milliseconds
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview questions table - stores generated interview questions
CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- CV document
  job_description_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- JD document
  question_type VARCHAR(50) NOT NULL, -- 'behavioral' | 'technical' | 'situational' | 'competency'
  difficulty VARCHAR(20) NOT NULL, -- 'beginner' | 'intermediate' | 'advanced'
  question_text TEXT NOT NULL,
  expected_answer TEXT,
  evaluation_criteria JSONB, -- Array of criteria
  order_index INTEGER NOT NULL DEFAULT 0, -- Order in the question set
  user_answer TEXT,
  evaluation_result JSONB, -- Stores evaluation feedback
  answered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cover letters table - stores generated cover letters
CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cv_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  jd_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  version VARCHAR(10) NOT NULL DEFAULT '1',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Verify all tables were created
SELECT
    table_name,
    column_count,
    has_primary_key
FROM (
    SELECT
        t.table_name,
        COUNT(c.column_name) as column_count,
        MAX(CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END) as has_primary_key
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT IN ('pg_vector_stat_stat')
    GROUP BY t.table_name
    ORDER BY t.table_name
) table_info;

-- Verify extensions are enabled
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('uuid-ossp', 'vector')
ORDER BY extname;

-- Verify vector columns exist
SELECT
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
    AND (data_type = 'USER-DEFINED' OR udt_name = 'vector')
ORDER BY table_name, column_name;

-- =============================================================================
-- Schema Summary
-- =============================================================================
-- Total tables expected: 15
-- Extensions required: uuid-ossp, vector
-- Vector columns: 2 (cv_embeddings.embedding, job_descriptions.embedding)
-- Vector dimensions: 1536 (OpenAI/OpenRouter embeddings)
-- =============================================================================