# Manual Database Setup for CV Information Collection Feature

## Issue
The `user_responses` table doesn't exist in the database yet, which is causing the error:
```
Could not find the table 'public.user_responses' in the schema cache
```

## Solution
You need to manually create the table in your Supabase dashboard. Here are the exact SQL commands to run:

## Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project (`ajhojfbovtirljkpaaqj`)
3. Go to the SQL Editor (in the left sidebar)

## Step 2: Run the SQL Script

Copy and paste the following SQL code into the SQL Editor and click "Run":

```sql
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

-- Add comments for documentation
COMMENT ON TABLE user_responses IS 'Stores questionnaire responses for CV generation workflow';
COMMENT ON COLUMN user_responses.question_category IS 'Category of question: personal, career, experience, formatting';
COMMENT ON COLUMN user_responses.question_id IS 'Unique identifier for the question template';
COMMENT ON COLUMN user_responses.answer IS 'JSON response to accommodate different answer types';
COMMENT ON COLUMN user_responses.is_required IS 'Whether this question must be answered';
COMMENT ON COLUMN user_responses.is_skipped IS 'Whether user chose to skip this question';
```

## Step 3: Verify the Table
After running the SQL, you can verify the table was created by running:

```sql
SELECT * FROM user_responses LIMIT 1;
```

You should see no results (since the table is empty) but no error either.

## Step 4: Restart Your Application
Once the table is created, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Step 5: Test the Feature
Now you can test the complete CV information collection workflow:

1. Upload a CV for analysis
2. Review and approve some improvements
3. Click "Answer Questions" to go to the information collection step
4. Fill out the questionnaire
5. Generate your personalized CV

The error should now be resolved and the feature should work correctly!