-- Migration: Add user_responses table for CV information collection
-- Date: 2025-01-08

-- Create user_responses table
CREATE TABLE IF NOT EXISTS user_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_category VARCHAR(50) NOT NULL, -- 'personal' | 'career' | 'experience' | 'formatting'
    question_id VARCHAR(100) NOT NULL, -- Unique identifier for the question
    question_text TEXT NOT NULL,
    answer JSONB, -- JSON for flexibility with different answer types
    is_required VARCHAR(10) NOT NULL DEFAULT 'false', -- 'true' | 'false'
    is_skipped VARCHAR(10) NOT NULL DEFAULT 'false', -- 'true' | 'false'
    skip_reason TEXT,
    order_index INTEGER NOT NULL DEFAULT 0, -- Order for displaying questions
    metadata JSONB, -- Additional data about question context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_responses_session_id ON user_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_user_id ON user_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_category ON user_responses(question_category);
CREATE INDEX IF NOT EXISTS idx_user_responses_question_id ON user_responses(question_id);

-- Enable Row Level Security
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own responses
CREATE POLICY "Users can view own responses" ON user_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses" ON user_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses" ON user_responses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own responses" ON user_responses
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_responses TO service_role;

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_responses_updated_at
    BEFORE UPDATE ON user_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_responses IS 'Stores questionnaire responses for CV generation workflow';
COMMENT ON COLUMN user_responses.question_category IS 'Category of question: personal, career, experience, formatting';
COMMENT ON COLUMN user_responses.question_id IS 'Unique identifier for the question template';
COMMENT ON COLUMN user_responses.answer IS 'JSON response to accommodate different answer types';
COMMENT ON COLUMN user_responses.is_required IS 'Whether this question must be answered';
COMMENT ON COLUMN user_responses.is_skipped IS 'Whether user chose to skip this question';