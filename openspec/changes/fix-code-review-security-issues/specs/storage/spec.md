# Storage Infrastructure Specification

## Overview

This specification covers the implementation of Supabase Storage infrastructure to support file uploads in the AI Job Hunt Agent system. The storage system enables users to upload CVs, job descriptions, and generated documents with proper security and access controls.

## Implementation Details

### Storage Bucket Configuration

**Bucket Name**: `documents`
- **Public Access**: Disabled (private bucket)
- **File Size Limit**: 10MB (10,485,760 bytes)
- **Location**: User-specific folder structure (`{user-id}/filename.ext`)
- **Allowed MIME Types**:
  - `application/pdf` (PDF files)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX files)
  - `text/plain` (TXT files)
  - `text/markdown` (Markdown files)
  - `text/x-markdown` (Alternative Markdown MIME type)
  - `text/md` (Alternative Markdown MIME type)

### Row Level Security (RLS) Policies

**Policy 1: Users can view their own documents**
```sql
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: Users can upload their own documents**
```sql
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: Users can update their own documents**
```sql
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
```

**Policy 4: Users can delete their own documents**
```sql
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### File Structure

Files are stored in the following structure:
```
documents/
├── {user-id-1}/
│   ├── cv.pdf
│   ├── job-description.docx
│   ├── cover-letter.md
│   └── generated-cv.md
├── {user-id-2}/
│   ├── resume.pdf
│   └── interview-prep.md
└── ...
```

### Application Integration

#### Document Upload Flow

1. **File Validation** (`src/actions/documents.ts`):
   - Validate file size (≤10MB)
   - Validate MIME type against allowed types
   - Sanitize filename

2. **Content Parsing** (`src/lib/services/document-parser.ts`):
   - PDF parsing using LangChain PDFLoader
   - DOCX parsing using LangChain DocxLoader
   - TXT parsing using UTF-8 text extraction
   - Markdown parsing using UTF-8 text extraction

3. **Storage Upload**:
   - Generate unique filename with user ID prefix
   - Upload to Supabase Storage bucket
   - Store metadata in database

4. **Database Record Creation**:
   - Create record in `documents` table
   - Store parsed content in JSONB format
   - Link file path to database record

### MCP-Driven Setup Process

The storage infrastructure was implemented using the Supabase Model Context Protocol (MCP):

1. **Diagnosis Phase**:
   - Used `mcp__supabase__list_tables` to check storage schema
   - Verified bucket existence using SQL queries
   - Identified missing "documents" bucket

2. **Bucket Creation**:
   - Used `mcp__supabase__apply_migration` to create bucket
   - Configured bucket with proper settings (private, 10MB limit, MIME types)

3. **RLS Policy Implementation**:
   - Applied RLS policies through database migrations
   - Ensured user isolation and proper access controls

4. **MIME Type Updates**:
   - Extended allowed MIME types to support Markdown files
   - Verified configuration through SQL queries

### Security Considerations

#### Access Control
- **User Isolation**: Each user can only access files in their own folder
- **RLS Protection**: Database-level security policies prevent unauthorized access
- **Private Bucket**: Files are not publicly accessible via URLs

#### File Validation
- **Size Limits**: 10MB maximum file size to prevent storage abuse
- **Type Validation**: Only allowed MIME types are accepted
- **Content Sanitization**: Filenames and paths are sanitized

#### Data Protection
- **PII Protection**: User IDs are used as folder prefixes, not PII
- **Secure Storage**: Files stored in private Supabase Storage
- **Audit Trail**: Database maintains file access records

### Error Handling

#### Common Error Scenarios

1. **Bucket Not Found**:
   ```
   Error: "Upload failed: Bucket not found"
   Cause: Storage bucket doesn't exist
   Solution: Create bucket using MCP or dashboard
   ```

2. **MIME Type Not Supported**:
   ```
   Error: "Upload failed: mime type {type} is not supported"
   Cause: File MIME type not in allowed list
   Solution: Convert file or use supported format
   ```

3. **File Size Exceeded**:
   ```
   Error: "File size exceeds 10MB limit"
   Cause: File larger than allowed size
   Solution: Compress or reduce file size
   ```

4. **Permission Denied**:
   ```
   Error: "Permission denied"
   Cause: RLS policy blocking access
   Solution: Ensure user is authenticated
   ```

### Performance Optimization

#### Database Indexing
- Created indexes on storage.objects for efficient querying
- RLS policy indexes for fast access control
- User-based indexing for file listing

#### Query Optimization
- Batch operations for multiple file operations
- Efficient folder name extraction using storage.foldername()
- Metadata optimization for quick access

### Monitoring and Maintenance

#### Cleanup Functions
- Automated cleanup of old rate limit records
- Storage usage monitoring
- File access logging

#### Verification Scripts
- Storage setup verification script
- MIME type configuration checker
- RLS policy validation tools

### Future Enhancements

#### Planned Improvements
1. **File Versioning**: Support for multiple versions of the same document
2. **Thumbnail Generation**: Automatic thumbnail creation for preview
3. **File Compression**: On-the-fly compression for large files
4. **Virus Scanning**: Integration with security scanning services
5. **CDN Integration**: Edge caching for improved performance

#### Scalability Considerations
- Multi-bucket architecture for different file types
- Geographic distribution for global users
- Load balancing for high-volume uploads
- Archive tier for long-term storage

## Implementation Status

### Completed Tasks
- [x] Storage bucket creation with proper configuration
- [x] RLS policies implementation
- [x] MIME type support extension
- [x] Application code updates
- [x] Document parser enhancement
- [x] Error handling improvements
- [x] Security configuration
- [x] MCP-driven setup process

### Verification Results
- [x] Bucket exists and is properly configured
- [x] RLS policies are active and functional
- [x] All MIME types are supported
- [x] File upload functionality works
- [x] User access controls are enforced
- [x] Security measures are effective

## Conclusion

The storage infrastructure implementation provides a robust, secure, and scalable foundation for file management in the AI Job Hunt Agent system. The MCP-driven approach enabled precise configuration and immediate verification of the setup, while the comprehensive security measures ensure data protection and proper access controls.

The system now supports all required file types (PDF, DOCX, TXT, Markdown) and provides a seamless user experience for document upload and management, enabling core features like CV analysis, skill gap assessment, and interview preparation.