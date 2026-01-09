# Spec: Job Matching

## Capability Overview

Job matching provides intelligent job recommendations based on CV similarity using semantic search. Enables users to find relevant job descriptions from their collection and discover similar opportunities.

## ADDED Requirements

### Requirement: Job Recommendation Service

The system SHALL provide service layer for recommending jobs based on CV embeddings.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- JM-001.1: Create `JobRecommendationService` class
- JM-001.2: Implement `recommendJobsBasedOnCV()` method
- JM-001.3: Use `vectorSearchService.vectorSearch()` for similarity
- JM-001.4: Apply RLS filtering by `user_id`
- JM-001.5: Support section type filtering (e.g., skills only)
- JM-001.6: Return ranked jobs with similarity scores and metadata

**Non-Functional Requirements**:
- JM-001.7: Recommendation latency target: <300ms
- JM-001.8: Similarity threshold: 0.65 (configurable)
- JM-001.9: Result limit: 10 jobs (configurable)
- JM-001.10: Return matching reasons (matched sections, scores)

#### Scenario: Recommend jobs based on full CV

**Given** a user has a CV with multiple section embeddings
**And** the user has job descriptions with embeddings
**When** the user requests job recommendations
**Then** the service aggregates all CV section embeddings
**And** searches for similar job descriptions
**And** returns jobs ranked by similarity score
**And** results are filtered by the similarity threshold

#### Scenario: Recommend jobs based on specific section

**Given** a user wants to find jobs matching their skills
**When** the user requests recommendations with section filter
**Then** only the skills section embedding is used
**And** results reflect skills-based similarity
**And** matching reasons indicate which skills matched

#### Scenario: No matching jobs above threshold

**Given** a user has a CV
**And** the user's job descriptions have low similarity
**When** the user requests job recommendations
**Then** an empty result set is returned
**And** a helpful message suggests uploading more relevant job descriptions

### Requirement: Job Recommendation API

The system SHALL provide server action for job recommendations.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- JM-002.1: Create `recommendJobs()` server action in `actions/jobs.ts`
- JM-002.2: Accept CV ID as input
- JM-002.3: Get user's CV embeddings from `cv_embeddings` table
- JM-002.4: Call `jobRecommendationService.recommendJobsBasedOnCV()`
- JM-002.5: Return formatted job recommendations with metadata

**Non-Functional Requirements**:
- JM-002.6: Require user authentication
- JM-002.7: Validate user owns the CV
- JM-002.8: Handle case where CV has no embeddings yet

#### Scenario: Authenticated user requests recommendations

**Given** a user is logged in
**And** the user has a CV with embeddings
**When** the user calls the `recommendJobs` action
**Then** the service validates the user owns the CV
**And** returns job recommendations with similarity scores

#### Scenario: CV has no embeddings yet

**Given** a user is logged in
**And** the user's CV was uploaded before embedding generation was enabled
**When** the user calls the `recommendJobs` action
**Then** the service detects missing embeddings
**And** returns an empty result with helpful message
**And** suggests regenerating embeddings

#### Scenario: User attempts to access another user's CV

**Given** a user is logged in
**When** the user requests recommendations for another user's CV ID
**Then** the action returns a "forbidden" error
**And** no recommendations are returned

### Requirement: Similar Jobs API

The system SHALL find jobs similar to a target job description.

**Priority**: MEDIUM
**Status**: NEW

**Functional Requirements**:
- JM-003.1: Create `findSimilarJobs()` server action
- JM-003.2: Accept job description ID as input
- JM-003.3: Find jobs similar to target job using vector search
- JM-003.4: Exclude the source job from results
- JM-003.5: Return ranked similar jobs with similarity scores

**Non-Functional Requirements**:
- JM-003.6: Similarity threshold: 0.70 (higher than CV matching)
- JM-003.7: Result limit: 5 jobs
- JM-003.8: Latency target: <300ms

#### Scenario: Find similar jobs to a target JD

**Given** a user is viewing a job description
**And** the job has an embedding
**When** the user requests similar jobs
**Then** the service finds similar job descriptions
**And** excludes the source job from results
**And** returns up to 5 similar jobs ranked by similarity

#### Scenario: Job description has no embedding

**Given** a user is viewing a job description
**And** the job lacks an embedding
**When** the user requests similar jobs
**Then** the service returns an empty result
**And** a message indicates the feature requires embeddings

### Requirement: Dashboard Integration

The system SHALL display recommended jobs on main dashboard.

**Priority**: MEDIUM
**Status**: NEW

**Functional Requirements**:
- JM-004.1: Add "Recommended Jobs" section to dashboard
- JM-004.2: Fetch recommendations on component mount
- JM-004.3: Display jobs with similarity scores and metadata
- JM-004.4: Show "View Details" and "Apply" buttons
- JM-004.5: Handle case where user has no CVs yet
- JM-004.6: Show empty state when no recommendations

**Non-Functional Requirements**:
- JM-004.7: Recommendations load asynchronously
- JM-004.8: Loading state shown while fetching
- JM-004.9: Error state with retry option

#### Scenario: Dashboard shows recommended jobs

**Given** a user is logged in
**And** the user has a CV with embeddings
**And** the user has job descriptions in their collection
**When** the user navigates to the dashboard
**Then** the "Recommended Jobs" section is displayed
**And** up to 10 jobs are shown with similarity scores
**And** each job has "View Details" and "Analyze" buttons

#### Scenario: New user without CV

**Given** a new user is logged in
**And** the user has no CVs
**When** the user navigates to the dashboard
**Then** an empty state is shown
**And** a message suggests uploading a CV first

#### Scenario: Loading and error states

**Given** a user is viewing the dashboard
**When** recommendations are being fetched
**Then** a loading spinner is shown
**And** if the fetch fails, an error message is shown
**And** a "Retry" button is available

### Requirement: Skill Gap Integration

The system SHALL auto-match jobs during skill gap analysis.

**Priority**: MEDIUM
**Status**: NEW

**Functional Requirements**:
- JM-005.1: After skill gap analysis, find similar job descriptions
- JM-005.2: Return top 3 matching jobs in analysis result
- JM-005.3: Include similarity scores and matching reasons
- JM-005.4: Handle case where no similar jobs exist

**Non-Functional Requirements**:
- JM-005.5: Similarity threshold: 0.60 (lower for broader matches)
- JM-005.6: Jobs must have embeddings to match

#### Scenario: Skill gap analysis includes recommended jobs

**Given** a user performs skill gap analysis
**And** the user has job descriptions in their collection
**When** the analysis completes
**Then** the top 3 similar jobs are included in results
**And** each job shows similarity score and matching reasons
**And** "Analyze This Job" buttons are available

#### Scenario: No similar jobs found

**Given** a user performs skill gap analysis
**And** no similar jobs exist in their collection
**When** the analysis completes
**Then** the results show no recommended jobs
**And** a message suggests uploading more job descriptions

## Dependencies

### Internal Dependencies
- `vector-search-service.ts` - Vector similarity search
- `job-recommendation-service.ts` - Job recommendation logic (NEW)
- `cv_embeddings` table - CV embeddings storage
- `job_descriptions` table - JD embeddings storage
- `skill-gap-agent.ts` - Skill gap workflow integration

### External Dependencies
- pgvector extension - Vector similarity search
- OpenRouter API - Embedding generation (for JDs)

## API Endpoints

### Server Actions (NEW)

```typescript
// Job Recommendations based on CV
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

// Similar Jobs to a target JD
export async function findSimilarJobs(
  jobDescriptionId: string,
  options?: {
    threshold?: number  // Default: 0.70
    limit?: number      // Default: 5
  }
): Promise<JobRecommendation[]>
```

## Database Schema

```typescript
// CV Embeddings (existing table)
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

// Job Descriptions (existing table)
export const jobDescriptions = pgTable('job_descriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  description: text('description').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow(),
})
```

## Testing Requirements

### Unit Tests
- JM-T001: Test job recommendation service with mock embeddings
- JM-T002: Test threshold filtering logic
- JM-T003: Test section type filtering
- JM-T004: Test RLS enforcement
- JM-T005: Test empty result handling
- JM-T006: Test similar jobs exclusion logic

### Integration Tests
- JM-T007: Query job recommendations for CV
- JM-T008: Query similar jobs for JD
- JM-T009: Verify RLS policies prevent cross-user access
- JM-T010: Test skill gap integration

### E2E Tests
- JM-T011: Complete workflow: upload CV, get recommendations, view details
- JM-T012: Skill gap analysis with recommended jobs

## UI Components

### New Components
- `recommended-jobs-section.tsx` - Dashboard section for job recommendations
- `job-card.tsx` - Display job with similarity score and actions

### Enhanced Components
- `dashboard/page.tsx` - Add recommended jobs section
- `skill-gap-results.tsx` - Add recommended jobs section

## Rollback Plan

Feature flag `ENABLE_SEMANTIC_SEARCH` in `app-config.ts`:
- Set to `false` to disable job recommendation features
- Job recommendation API returns empty results
- Dashboard hides recommended jobs section
- Skill gap analysis continues without job matching

## Future Enhancements (Out of Scope)

- JM-F001: Job application tracking
- JM-F002: Job bookmarking/saving
- JM-F003: Job search from external sources (LinkedIn, Indeed)
- JM-F004: Automatic job alerts based on CV
- JM-F005: Salary estimation and comparison
- JM-F006: Company research integration
