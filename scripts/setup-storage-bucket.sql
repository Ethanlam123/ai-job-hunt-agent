-- Supabase Storage Bucket Setup
-- This script creates the necessary storage bucket and RLS policies for document uploads

-- 1. Create the documents storage bucket
-- Note: This must be run with service role permissions

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS policies for the documents bucket

-- Policy: Users can read their own files
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can upload their own files
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Create storage helper functions

-- Function to check if a user owns a file
CREATE OR REPLACE FUNCTION storage.user_owns_file(file_path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid()::text = (storage.foldername(file_path))[1];
$$;

-- Function to get user's files
CREATE OR REPLACE FUNCTION storage.get_user_files(user_id uuid)
RETURNS table(
  name text,
  bucket_id text,
  owner_id uuid,
  id bigint,
  created_at timestamptz,
  updated_at timestamptz,
  last_accessed_at timestamptz,
  metadata jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    o.name,
    o.bucket_id,
    o.owner_id,
    o.id,
    o.created_at,
    o.updated_at,
    o.last_accessed_at,
    o.metadata
  FROM storage.objects o
  WHERE o.bucket_id = 'documents'
    AND user_id::text = (storage.foldername(o.name))[1];
$$;

-- 4. Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- 5. Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Create storage cleanup function (optional)
CREATE OR REPLACE FUNCTION storage.cleanup_old_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date timestamptz := NOW() - INTERVAL '30 days';
BEGIN
  -- Delete files older than 30 days (adjust as needed)
  DELETE FROM storage.objects
  WHERE bucket_id = 'documents'
    AND created_at < cutoff_date;

  -- Log the cleanup
  RAISE LOG 'Cleaned up % old storage files', ROW_COUNT;
END;
$$;

-- Create a trigger to automatically log file access (optional)
CREATE OR REPLACE FUNCTION storage.log_file_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_accessed_at when a file is read
  IF TG_OP = 'SELECT' THEN
    UPDATE storage.objects
    SET last_accessed_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Note: Uncomment the following lines if you want to enable access logging
-- CREATE TRIGGER storage_file_access_log
-- AFTER SELECT ON storage.objects
-- FOR EACH ROW EXECUTE FUNCTION storage.log_file_access();

-- 7. Verify setup
SELECT
  'Storage bucket setup completed' as status,
  bucket_id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';