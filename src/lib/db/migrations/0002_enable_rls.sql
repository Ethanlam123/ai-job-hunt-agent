-- Enable Row Level Security on all tables
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

-- Sessions: Users can only access their own sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: Users can only access messages from their sessions
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()
    )
  );

-- Documents: Users can only access their own documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- CV Embeddings: Users can only access embeddings for their documents
CREATE POLICY "Users can view own cv embeddings" ON cv_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cv embeddings" ON cv_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Job Descriptions: Users can only access their own job descriptions
CREATE POLICY "Users can view own job descriptions" ON job_descriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job descriptions" ON job_descriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tasks: Users can only access their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Cache: Users can access user-scoped and public cache
CREATE POLICY "Users can view own cache" ON cache
  FOR SELECT USING (
    key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
  );

CREATE POLICY "Users can insert own cache" ON cache
  FOR INSERT WITH CHECK (
    key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
  );

CREATE POLICY "Users can update own cache" ON cache
  FOR UPDATE USING (
    key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
  );

CREATE POLICY "Users can delete own cache" ON cache
  FOR DELETE USING (
    key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
  );

-- Rate Limits: All authenticated users can manage rate limits
CREATE POLICY "Users can manage rate limits" ON rate_limits
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Approvals: Users can only access their own approvals
CREATE POLICY "Users can view own approvals" ON approvals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own approvals" ON approvals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own approvals" ON approvals
  FOR UPDATE USING (auth.uid() = user_id);

-- Skill Gaps: Users can only access their own skill gaps
CREATE POLICY "Users can view own skill gaps" ON skill_gaps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skill gaps" ON skill_gaps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Metrics: Users can only access their own metrics
CREATE POLICY "Users can view own metrics" ON user_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" ON user_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- LLM Calls: Users can only access their own LLM call logs
CREATE POLICY "Users can view own llm calls" ON llm_calls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own llm calls" ON llm_calls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Interview Questions: Users can only access their own interview questions
CREATE POLICY "Users can view own interview questions" ON interview_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview questions" ON interview_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview questions" ON interview_questions
  FOR UPDATE USING (auth.uid() = user_id);

-- Cover Letters: Users can only access their own cover letters
CREATE POLICY "Users can view own cover letters" ON cover_letters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cover letters" ON cover_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cover letters" ON cover_letters
  FOR UPDATE USING (auth.uid() = user_id);
