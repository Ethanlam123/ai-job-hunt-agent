-- Migration: Update interview_questions table structure
-- This migration updates the interview_questions table to match the InterviewAgent implementation

-- Add new columns
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS job_description_id uuid REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS question_type varchar(50);
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS question_text text;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS expected_answer text;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS evaluation_criteria jsonb;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS evaluation_result jsonb;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS answered_at timestamp;
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Migrate data from old columns to new columns
UPDATE interview_questions SET question_text = question WHERE question_text IS NULL AND question IS NOT NULL;
UPDATE interview_questions SET question_type = category WHERE question_type IS NULL AND category IS NOT NULL;
UPDATE interview_questions SET expected_answer = suggested_answer WHERE expected_answer IS NULL AND suggested_answer IS NOT NULL;
UPDATE interview_questions SET evaluation_result = jsonb_build_object('feedback', feedback) WHERE evaluation_result IS NULL AND feedback IS NOT NULL;

-- Make new columns NOT NULL after data migration
ALTER TABLE interview_questions ALTER COLUMN question_type SET NOT NULL;
ALTER TABLE interview_questions ALTER COLUMN question_text SET NOT NULL;
ALTER TABLE interview_questions ALTER COLUMN order_index SET NOT NULL;

-- Drop old columns
ALTER TABLE interview_questions DROP COLUMN IF EXISTS question;
ALTER TABLE interview_questions DROP COLUMN IF EXISTS category;
ALTER TABLE interview_questions DROP COLUMN IF EXISTS suggested_answer;
ALTER TABLE interview_questions DROP COLUMN IF EXISTS feedback;
