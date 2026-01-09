# Spec: CV Analysis

## Capability Overview

CV analysis provides AI-powered resume analysis, improvement suggestions, and semantic job matching. Enhanced with embeddings to enable intelligent job recommendations based on CV content similarity.

## ADDED Requirements

### Requirement: CV Section Embedding Generation

The system SHALL generate embeddings for CV sections to enable semantic job matching.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- CVA-003.1: Extract CV sections from parsed_content JSONB
- CVA-003.2: Generate embeddings for each section using Qwen 8B
- CVA-003.3: Store embeddings in `cv_embeddings` table
- CVA-003.4: Associate embeddings with document ID and user ID
- CVA-003.5: Handle missing or malformed parsed content

**Section Types**:
- Skills/Technical Skills
- Experience/Work Experience
- Education
- Projects
- Summary/Objective
- Certifications
- Languages

**Non-Functional Requirements**:
- CVA-003.6: Embedding generation MUST NOT block CV upload
- CVA-003.7: Async processing with status tracking
- CVA-003.8: Graceful degradation on API failure
- CVA-003.9: Feature flag `ENABLE_SEMANTIC_SEARCH` controls generation

#### Scenario: Generate embeddings for CV sections

**Given** a user uploads a CV file
**And** the document parser has successfully parsed the content
**When** the parsed content contains sections
**Then** embeddings are generated for each section
**And** embeddings are stored in the `cv_embeddings` table with document and user ID
**And** the CV upload completes successfully

#### Scenario: Handle missing parsed content gracefully

**Given** a user uploads a CV file
**And** the document parser completes but parsed_content is missing
**When** the embedding generation process runs
**Then** the process is skipped gracefully
**And** the CV upload still succeeds
**And** a warning is logged for debugging

#### Scenario: Feature flag disables embedding generation

**Given** the `ENABLE_SEMANTIC_SEARCH` feature flag is set to `false`
**When** a CV is uploaded
**Then** no embeddings are generated
**And** the CV upload proceeds normally

### Requirement: Semantic Job Matching

The system SHALL match CV to job descriptions using semantic similarity.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- CVA-004.1: Find jobs similar to CV using vector search
- CVA-004.2: Return ranked job list with similarity scores
- CVA-004.3: Configurable similarity threshold (default 0.65)
- CVA-004.4: Configurable result limit (default 10 jobs)
- CVA-004.5: Section-specific matching (e.g., skills section only)

**Non-Functional Requirements**:
- CVA-004.6: Job matching latency target: <500ms
- CVA-004.7: RLS-compliant (user's CV, user's job descriptions)
- CVA-004.8: Return matching reasons (which sections matched)

#### Scenario: Get job recommendations based on CV

**Given** a user has a CV with embeddings
**And** the user has job descriptions in their collection
**When** the user requests job recommendations
**Then** the system returns jobs ranked by similarity score
**And** each job includes similarity score and matching reasons
**And** jobs below the threshold are filtered out

#### Scenario: Filter by section type

**Given** a user wants to find jobs matching their skills section
**When** the user requests recommendations with section filter
**Then** only the skills section embedding is used for matching
**And** results reflect skills-based similarity

#### Scenario: No job descriptions available

**Given** a user uploads a CV
**And** the user has no job descriptions in their collection
**When** the user requests job recommendations
**Then** an empty result set is returned
**And** a helpful message suggests uploading job descriptions

### Requirement: CV Duplicate Detection

The system SHALL detect duplicate or similar CVs during upload.

**Priority**: MEDIUM
**Status**: NEW

**Functional Requirements**:
- CVA-005.1: Check for similar existing CVs after parsing
- CVA-005.2: Use similarity threshold of 0.95 for duplicates
- CVA-005.3: Return list of similar document IDs
- CVA-005.4: Show warning to user before upload completes
- CVA-005.5: Offer options: "Continue anyway" or "Use existing"

**Non-Functional Requirements**:
- CVA-005.6: Duplicate check latency: <1s
- CVA-005.7: Handle case where no embedding exists yet

#### Scenario: Detect duplicate CV during upload

**Given** a user uploads a CV file
**And** a similar CV already exists in their collection
**When** the upload completes parsing
**Then** a duplicate warning is displayed
**And** the similar CVs are shown
**And** user can choose "Continue anyway" or "Use existing"

#### Scenario: User chooses to use existing CV

**Given** a duplicate warning is shown
**When** the user clicks "Use existing"
**Then** the new upload is cancelled
**And** the existing CV is selected
**And** no duplicate record is created

#### Scenario: User continues with duplicate upload

**Given** a duplicate warning is shown
**When** the user clicks "Continue anyway"
**Then** the upload proceeds normally
**And** the new CV is saved

#### Scenario: No embedding for comparison

**Given** a user uploads their first CV
**And** no existing CVs have embeddings
**When** the duplicate check runs
**Then** no duplicates are detected
**And** the upload proceeds without warning

## Dependencies

### Internal Dependencies
- `document-parser.ts` - Document parsing workflow
- `vector-search-service.ts` - Embedding generation and vector search
- `cv-agent.ts` - CV analysis agent
- `job-recommendation-service.ts` - Job matching logic (NEW)

### External Dependencies
- OpenRouter API - Qwen 8B embedding model
- pgvector extension - Vector similarity search

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

// Documents (existing table with parsed_content)
export const documents = pgTable('documents', {
  // ... other fields
  parsedContent: jsonb('parsed_content'),
  // Stores: { fullText, sections: { [type]: content } }
})
```

## API Endpoints

### Server Actions

```typescript
// CV Analysis (existing)
export async function analyzeCV(documentId: string, sessionId: string)

// Job Recommendations (NEW)
export async function recommendJobs(
  cvId: string,
  options?: {
    threshold?: number      // Default: 0.65
    limit?: number          // Default: 10
    sectionType?: string[]  // Filter by CV section type
  }
): Promise<JobRecommendation[]>

type JobRecommendation = {
  jobDescriptionId: string
  title: string
  company?: string
  similarityScore: number
  matchedSections: string[]
  matchingReasons: string[]
}
```

## Testing Requirements

### Unit Tests
- CVA-T001: Test CV section extraction from parsed_content
- CVA-T002: Test embedding generation for CV sections
- CVA-T003: Test job recommendation logic
- CVA-T004: Test duplicate detection threshold
- CVA-T005: Test feature flag disables embedding generation

### Integration Tests
- CVA-T006: Upload CV and verify embeddings created
- CVA-T007: Query job recommendations for CV
- CVA-T008: Upload duplicate CV and verify warning shown
- CVA-T009: Verify RLS policies enforced

### E2E Tests
- CVA-T010: Complete CV analysis workflow with job recommendations
- CVA-T011: Upload similar CV and handle duplicate warning

## Migration Requirements

### Backfill Script
```bash
# Generate embeddings for existing CVs
scripts/backfill-embeddings.ts --type=cv
```

## UI Components

### New Components
- `recommended-jobs-section.tsx` - Display job recommendations on dashboard
- `duplicate-warning-dialog.tsx` - Show duplicate CV warning during upload

### Enhanced Components
- `cv-analysis-results.tsx` - Add job recommendations section
- `document-uploader.tsx` - Add duplicate detection warning

## Rollback Plan

Feature flag `ENABLE_SEMANTIC_SEARCH` in `app-config.ts`:
- Set to `false` to disable CV embedding generation
- CV analysis continues without job recommendations
- Duplicate detection disabled (use file hash only)

## Existing Infrastructure (Already Implemented)

### CVA-001: CV Document Parsing
**Status**: IMPLEMENTED
- Support PDF parsing via pdf-parse library
- Support DOCX parsing via mammoth library
- Support TXT file direct text extraction
- Store parsed content in JSONB format with sections

### CVA-002: CV Content Analysis
**Status**: IMPLEMENTED
- Analyze structure, formatting, clarity
- Identify missing sections
- Suggest improvements for clarity and impact
- Human-in-the-loop approval for CV changes
