-- Add job_description_id column to sessions table
-- This will reference a job description document for enhanced CV analysis

ALTER TABLE sessions
ADD COLUMN job_description_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- Add analysis_type column to track whether analysis was general or job-enhanced
ALTER TABLE sessions
ADD COLUMN analysis_type VARCHAR(20) DEFAULT 'general'
CHECK (analysis_type IN ('general', 'job_enhanced'));

-- Create index for faster queries
CREATE INDEX idx_sessions_job_description_id ON sessions(job_description_id);
CREATE INDEX idx_sessions_analysis_type ON sessions(analysis_type);

-- Add comment for documentation
COMMENT ON COLUMN sessions.job_description_id IS 'Optional reference to a job description document for enhanced CV analysis';
COMMENT ON COLUMN sessions.analysis_type IS 'Type of analysis performed: general or job_enhanced';