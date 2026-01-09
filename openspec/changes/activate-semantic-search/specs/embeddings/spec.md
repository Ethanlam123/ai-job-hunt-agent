# Spec: Embeddings

## Capability Overview

The embeddings capability provides vector storage and semantic similarity search for CV content, job descriptions, and skill gap analysis. Uses Qwen 8B embeddings via OpenRouter (1536 dimensions) with pgvector for cosine similarity search.

## ADDED Requirements

### Requirement: Embedding Generation

The system SHALL generate embeddings for CV sections and job descriptions during document processing workflows.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- EMB-001.1: Generate embeddings for CV sections immediately after document parsing
- EMB-001.2: Generate embeddings for job descriptions during skill gap analysis
- EMB-001.3: Extract CV sections from parsed_content JSONB for granular embedding
- EMB-001.4: Support batch embedding generation for multiple CV sections

**Non-Functional Requirements**:
- EMB-001.5: Embedding generation MUST NOT block document upload (async processing)
- EMB-001.6: Implement retry with exponential backoff for failed API calls
- EMB-001.7: Maximum 3 retries before graceful degradation
- EMB-001.8: Embedding generation latency target: <2s per CV with 5 sections

#### Scenario: Generate CV embeddings during upload

**Given** a user uploads a CV file
**When** the document parser finishes parsing
**Then** embeddings are generated for each CV section
**And** embeddings are stored in the `cv_embeddings` table
**And** document upload succeeds even if embedding generation fails

#### Scenario: Generate JD embedding during skill gap analysis

**Given** a user submits a job description for skill gap analysis
**When** the skill gap agent analyzes the job description
**Then** an embedding is generated for the job description
**And** the embedding is stored in the `job_descriptions` table

#### Scenario: Feature flag disables embedding generation

**Given** the `ENABLE_SEMANTIC_SEARCH` feature flag is set to `false`
**When** a document is uploaded or skill gap analysis is run
**Then** no embeddings are generated
**And** the workflow continues without errors

### Requirement: Cost Management

The system SHALL monitor and control embedding API costs.

**Priority**: MEDIUM
**Status**: NEW

**Functional Requirements**:
- EMB-005.1: Track embedding generation metrics (count, tokens, cost)
- EMB-005.2: Log embedding generation failures
- EMB-005.3: Rate limiting for API calls if needed
- EMB-005.4: Feature flag to disable if costs unsustainable

**Cost Estimates**:
- Qwen 8B via OpenRouter: ~$0.0001 per 1K tokens
- CV with 5 sections (~2000 tokens): ~$0.0002 per CV
- 1000 CVs: ~$0.20
- Job description (~500 tokens): ~$0.00005 per JD

#### Scenario: Track embedding generation metrics

**Given** embeddings are being generated
**When** the generation process completes
**Then** metrics are logged (count, tokens, estimated cost)
**And** failures are logged with error details

#### Scenario: Disable embedding generation via feature flag

**Given** API costs are exceeding budget
**When** the `ENABLE_SEMANTIC_SEARCH` flag is set to `false`
**Then** embedding generation stops immediately
**And** existing functionality continues without embeddings

### Requirement: Error Handling

The system SHALL gracefully degrade when embedding generation fails.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- EMB-006.1: Don't block document upload on embedding failure
- EMB-006.2: Retry with exponential backoff (max 3 attempts)
- EMB-006.3: Clear error messaging for debugging
- EMB-006.4: Fallback to text-based search if embeddings unavailable

#### Scenario: Embedding API failure during CV upload

**Given** a user uploads a CV file
**When** the embedding generation API fails
**Then** the system retries up to 3 times with exponential backoff
**And** the document upload still succeeds
**And** an error is logged for debugging
**And** the user sees a warning that semantic features may be limited

#### Scenario: Embedding generation succeeds after retry

**Given** the first embedding generation attempt fails
**When** the system retries with exponential backoff
**Then** the retry succeeds
**And** embeddings are stored normally
**And** the user experience is unaffected

## Dependencies

### Internal Dependencies
- `vector-search-service.ts` - Vector search and embedding generation
- `document-parser.ts` - Document parsing workflow
- `database-service.ts` - Database operations for embeddings
- `app-config.ts` - Feature flag `ENABLE_SEMANTIC_SEARCH`

### External Dependencies
- OpenRouter API - Qwen 8B embedding model
- pgvector extension - PostgreSQL vector operations

## Database Schema

```typescript
// CV Embeddings (existing table, currently unused)
export const cvEmbeddings = pgTable('cv_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull(),
  userId: uuid('user_id').notNull(),
  sectionType: varchar('section_type', { length: 50 }),
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Job Descriptions (existing table with unused embedding column)
export const jobDescriptions = pgTable('job_descriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  embedding: vector('embedding', { dimensions: 1536 }),
  // ... other fields
})
```

## Testing Requirements

### Unit Tests
- EMB-T001: Test CV section extraction from parsed_content
- EMB-T002: Test batch embedding generation
- EMB-T003: Test error handling and retries
- EMB-T004: Test feature flag behavior
- EMB-T005: Test SHA-256 hash function

### Integration Tests
- EMB-T006: Upload CV and verify embeddings created
- EMB-T007: Analyze skill gap and verify JD embedding
- EMB-T008: Verify RLS policies enforced for all operations

## Migration Requirements

### Backfill Script
```bash
# Generate embeddings for existing CVs
scripts/backfill-embeddings.ts --type=cv

# Generate embeddings for existing job descriptions
scripts/backfill-embeddings.ts --type=jd
```

## Rollback Plan

Feature flag `ENABLE_SEMANTIC_SEARCH` in `app-config.ts`:
- Set to `false` to disable embedding generation
- No database changes to rollback
- Existing embeddings remain but unused
- Text-based search continues to work

## Existing Infrastructure (Already Implemented)

### EMB-002: Embedding Storage
**Status**: IMPLEMENTED - Tables exist with vector columns
- `cv_embeddings` table stores section-level embeddings
- `job_descriptions` table has `embedding` column
- All embeddings use 1536 dimensions (Qwen 8B)
- RLS policies enforce user-scoped access

### EMB-003: Embedding Caching
**Status**: IMPLEMENTED - LRU cache exists
- LRU cache for recent embeddings (max 1000 entries, 1 hour TTL)
- PostgreSQL cache for long-term storage (user-scoped keys)
- SHA-256 hash for cache key generation
- Batch processing to reduce API calls

### EMB-004: Vector Similarity Search
**Status**: IMPLEMENTED - Service exists, not used
- Uses `<=>` operator for cosine similarity
- Whitelist validation for SQL injection prevention
- RLS-compliant filtering (user_id)
- Vector search service with caching
