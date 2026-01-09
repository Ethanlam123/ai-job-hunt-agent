# Change: Activate Semantic Search with Embeddings

## Why

The codebase has complete infrastructure for vector embeddings and semantic search (pgvector schema, vector search service, caching, security) but **embeddings are never generated or used**. Currently:

1. CV analysis uses LLM text analysis only (no semantic similarity)
2. Job matching relies on exact text matching or manual selection
3. No intelligent job recommendations based on CV content
4. Duplicate detection relies on file hashes only
5. Skill gap analysis requires manual job description entry

By activating the embedding infrastructure, we can enable:
- **Semantic job matching**: Find jobs that match CV content even with different terminology
- **Intelligent job recommendations**: Suggest relevant jobs based on user's CV
- **Duplicate content detection**: Identify similar CVs/job descriptions
- **Enhanced skill gap analysis**: Auto-match jobs to user's CV

## What Changes

### New Features
- Generate embeddings for CV sections during document upload
- Generate embeddings for job descriptions during skill gap analysis
- Add semantic job search/recommendation endpoint
- Add similar document detection

### Database Schema Changes
- None required (cv_embeddings and job_descriptions tables already exist with vector columns)

### Service Layer Changes
- Trigger embedding generation in document parser service
- Add job recommendation service using vector similarity
- Enhance skill gap workflow with auto-job matching

### API Changes
- POST `/api/jobs/recommend` - Get job recommendations based on CV
- POST `/api/jobs/similar` - Find similar jobs to a target job
- GET `/api/documents/similar/:id` - Find similar documents

### UI Changes
- Add "Recommended Jobs" section to dashboard
- Show job similarity scores in skill gap analysis
- Display duplicate warnings during upload

## Impact

### Affected Specs
- **embeddings** - New capability for embedding generation and storage
- **cv-analysis** - Enhanced with semantic job matching
- **job-matching** - New capability for job recommendations

### Affected Code
- `src/lib/services/document-parser.ts` - Add embedding generation trigger
- `src/lib/services/vector-search-service.ts` - Already ready, just needs activation
- `src/lib/services/job-recommendation-service.ts` - New service
- `src/actions/documents.ts` - Add embedding generation to upload flow
- `src/actions/skill-gap.ts` - Add job recommendations to analysis
- `src/app/(dashboard)/dashboard/page.tsx` - Add recommended jobs section

### Breaking Changes
None - All changes are additive enhancements

### Migration Requirements
- No database schema changes required
- Backfill embeddings for existing documents (one-time migration script)
- Update job description embedding when JD is analyzed

### Risk Assessment
- **Performance Risk**: LOW - Embedding generation is async with caching
- **Cost Risk**: LOW - Qwen embeddings via OpenRouter are cost-effective
- **Data Quality Risk**: LOW - Existing embeddings infrastructure is robust
- **Rollback Plan**: Feature flag can disable semantic search without breaking existing functionality
