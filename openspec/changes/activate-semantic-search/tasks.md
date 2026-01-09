# Implementation Tasks

## 1. Embedding Generation Infrastructure

### 1.1 Add Embedding Generation to Document Parser

#### 1.1.1 Extract CV Sections for Embedding
- [ ] 1.1.1.1 Create `extractCVSections()` helper function
- [ ] 1.1.1.2 Parse `parsed_content` JSONB into typed sections
- [ ] 1.1.1.3 Handle missing or malformed parsed content
- [ ] 1.1.1.4 Return array of section objects with type and content

**Files**: `src/lib/services/document-parser.ts`

**Validation**: Unit tests for section extraction

---

#### 1.1.2 Generate Embeddings During CV Upload
- [ ] 1.1.2.1 Call `vectorSearchService.generateBatchEmbeddings()` for CV sections
- [ ] 1.1.2.2 Insert embeddings into `cv_embeddings` table
- [ ] 1.1.2.3 Handle errors gracefully (don't block upload)
- [ ] 1.1.2.4 Log embedding generation metrics

**Files**: `src/lib/services/document-parser.ts`

**Validation**: CV upload creates embedding records

---

#### 1.1.3 Generate Embedding for Job Descriptions
- [ ] 1.1.3.1 Generate embedding when JD is analyzed in skill gap workflow
- [ ] 1.1.3.2 Update `job_descriptions` table with embedding
- [ ] 1.1.3.3 Cache embedding to avoid regeneration
- [ ] 1.1.3.4 Handle embedding generation failures

**Files**: `src/lib/agents/skill-gap-agent.ts`

**Validation**: Skill gap analysis creates JD embedding

---

### 1.2 Add Feature Flag

#### 1.2.1 Create Semantic Search Feature Flag
- [ ] 1.2.1.1 Add `ENABLE_SEMANTIC_SEARCH` to app config
- [ ] 1.2.1.2 Default to `true` for development
- [ ] 1.2.1.3 Allow environment variable override
- [ ] 1.2.1.4 Check flag before embedding generation

**Files**: `src/lib/config/app-config.ts`

**Validation**: Setting flag to `false` skips embedding generation

---

## 2. Job Recommendation Service

### 2.1 Create Job Recommendation Service

#### 2.1.1 Implement Core Recommendation Logic
- [ ] 2.1.1.1 Create `JobRecommendationService` class
- [ ] 2.1.1.2 Implement `recommendJobsBasedOnCV()` method
- [ ] 2.1.1.3 Use `vectorSearchService.vectorSearch()` for similarity
- [ ] 2.1.1.4 Apply RLS filtering (`user_id`)

**Files**: `src/lib/services/job-recommendation-service.ts` (new file)

**Validation**: Returns ranked job list with similarity scores

---

#### 2.1.2 Add Similarity Threshold and Filtering
- [ ] 2.1.2.1 Default threshold: 0.65 (configurable)
- [ ] 2.1.2.2 Default limit: 10 jobs (configurable)
- [ ] 2.1.2.3 Optional section type filtering
- [ ] 2.1.2.4 Return metadata (similarity score, matched sections)

**Files**: `src/lib/services/job-recommendation-service.ts`

**Validation**: Threshold filters out low-quality matches

---

### 2.2 Create Job Recommendation API

#### 2.2.1 Create Server Action for Job Recommendations
- [ ] 2.2.1.1 Create `recommendJobs()` server action
- [ ] 2.2.1.2 Get user's CV embedding from `cv_embeddings`
- [ ] 2.2.1.3 Call `jobRecommendationService.recommendJobsBasedOnCV()`
- [ ] 2.2.1.4 Return formatted job recommendations

**Files**: `src/actions/jobs.ts` (new file)

**Validation**: API returns jobs with similarity scores

---

#### 2.2.2 Create Server Action for Similar Jobs
- [ ] 2.2.2.1 Create `findSimilarJobs()` server action
- [ ] 2.2.2.2 Accept job description ID as input
- [ ] 2.2.2.3 Find jobs similar to target job
- [ ] 2.2.2.4 Exclude the source job from results

**Files**: `src/actions/jobs.ts`

**Validation**: Returns similar jobs for a given JD

---

## 3. Duplicate Detection

### 3.1 Add Duplicate Detection During Upload

#### 3.1.1 Check for Similar Existing Documents
- [ ] 3.1.1.1 After parsing, check for similar CVs in database
- [ ] 3.1.1.2 Use similarity threshold of 0.95
- [ ] 3.1.1.3 Return list of similar document IDs
- [ ] 3.1.1.4 Handle case where no embedding exists yet

**Files**: `src/lib/services/document-parser.ts`

**Validation**: Detects near-duplicate uploads

---

#### 3.1.2 Add User Warning for Duplicates
- [ ] 3.1.2.1 Create UI component for duplicate warning
- [ ] 3.1.2.2 Show warning if similar documents found
- [ ] 3.1.2.3 Offer options: "Continue anyway" or "Use existing"
- [ ] 3.1.2.4 Skip upload if user chooses existing document

**Files**: `src/components/documents/document-uploader.tsx`

**Validation**: User sees duplicate warning before upload completes

---

## 4. Dashboard Enhancements

### 4.1 Add Recommended Jobs Section

#### 4.1.1 Create Recommended Jobs Component
- [ ] 4.1.1.1 Create `recommended-jobs-section.tsx` component
- [ ] 4.1.1.2 Fetch recommendations on component mount
- [ ] 4.1.1.3 Display jobs with similarity scores
- [ ] 4.1.1.4 Show "View Details" and "Apply" buttons

**Files**: `src/components/jobs/recommended-jobs-section.tsx` (new file)

**Validation**: Dashboard shows recommended jobs section

---

#### 4.1.2 Integrate with Main Dashboard
- [ ] 4.1.2.1 Add recommended jobs section to dashboard layout
- [ ] 4.1.2.2 Pass user's default CV ID to component
- [ ] 4.1.2.3 Handle case where user has no CVs yet
- [ ] 4.1.2.4 Show empty state when no recommendations

**Files**: `src/app/(dashboard)/dashboard/page.tsx`

**Validation**: Dashboard displays recommended jobs

---

## 5. Skill Gap Enhancement

### 5.1 Add Job Recommendations to Skill Gap Analysis

#### 5.1.1 Auto-Match Jobs During Analysis
- [ ] 5.1.1.1 After skill gap analysis, find similar job descriptions
- [ ] 5.1.1.2 Return top 3 matching jobs in analysis result
- [ ] 5.1.1.3 Include similarity scores and matching reasons
- [ ] 5.1.1.4 Handle case where no similar jobs exist

**Files**: `src/lib/agents/skill-gap-agent.ts`

**Validation**: Skill gap result includes recommended jobs

---

#### 5.1.2 Update UI to Show Recommended Jobs
- [ ] 5.1.2.1 Add "Recommended Jobs" section to results tab
- [ ] 5.1.2.2 Display job cards with similarity scores
- [ ] 5.1.2.3 Link to full job description details
- [ ] 5.1.2.4 Add "Analyze This Job" button for quick analysis

**Files**: `src/components/skill-gap/skill-gap-results.tsx`

**Validation**: Results tab shows recommended jobs

---

## 6. Backfill Existing Data

### 6.1 Create Migration Script

#### 6.1.1 Write Backfill Script for Existing CVs
- [ ] 6.1.1.1 Create `scripts/backfill-embeddings.ts`
- [ ] 6.1.1.2 Query all existing CVs with parsed_content
- [ ] 6.1.1.3 Generate embeddings for each CV section
- [ ] 6.1.1.4 Batch insert into `cv_embeddings` table
- [ ] 6.1.1.5 Add progress logging and error handling

**Files**: `scripts/backfill-embeddings.ts` (new file)

**Validation**: Script completes without errors

---

#### 6.1.2 Write Backfill Script for Existing Job Descriptions
- [ ] 6.1.2.1 Extend script to handle existing job descriptions
- [ ] 6.1.2.2 Generate embeddings for all historical JDs
- [ ] 6.1.2.3 Update `job_descriptions` table with embeddings
- [ ] 6.1.2.4 Add rate limiting to avoid API throttling

**Files**: `scripts/backfill-embeddings.ts`

**Validation**: All existing JDs have embeddings

---

## 7. Testing

### 7.1 Unit Tests

#### 7.1.1 Test Embedding Generation
- [ ] 7.1.1.1 Test CV section extraction
- [ ] 7.1.1.2 Test batch embedding generation
- [ ] 7.1.1.3 Test error handling and retries
- [ ] 7.1.1.4 Test feature flag behavior

**Files**: `src/__tests__/unit/embedding-generation.test.ts` (new file)

**Validation**: All unit tests pass

---

#### 7.1.2 Test Job Recommendations
- [ ] 7.1.2.1 Test recommendation logic with mock embeddings
- [ ] 7.1.2.2 Test threshold filtering
- [ ] 7.1.2.3 Test RLS enforcement
- [ ] 7.1.2.4 Test empty result handling

**Files**: `src/__tests__/unit/job-recommendation.test.ts` (new file)

**Validation**: All unit tests pass

---

### 7.2 Integration Tests

#### 7.2.1 Test End-to-End Embedding Workflow
- [ ] 7.2.1.1 Upload CV and verify embeddings created
- [ ] 7.2.1.2 Analyze skill gap and verify JD embedding
- [ ] 7.2.1.3 Query job recommendations
- [ ] 7.2.1.4 Verify RLS policies enforced

**Files**: `src/__tests__/integration/semantic-search.test.ts` (new file)

**Validation**: All integration tests pass

---

## 8. Documentation

### 8.1 Update Documentation

#### 8.1.1 Update CLAUDE.md
- [ ] 8.1.1.1 Document embedding generation workflow
- [ ] 8.1.1.2 Document job recommendation API
- [ ] 8.1.1.3 Update architecture overview
- [ ] 8.1.1.4 Add troubleshooting section

**Files**: `CLAUDE.md`

**Validation**: Documentation is accurate and complete

---

#### 8.1.2 Create API Documentation
- [ ] 8.1.2.1 Document `/api/jobs/recommend` endpoint
- [ ] 8.1.2.2 Document `/api/jobs/similar` endpoint
- [ ] 8.1.2.3 Document request/response formats
- [ ] 8.1.2.4 Add usage examples

**Files**: `docs/api/semantic-search.md` (new file)

**Validation**: API docs are complete

---

## 9. Validation

### 9.1 Pre-Merge Checklist
- [ ] 9.1.1 All TypeScript type checking passes
- [ ] 9.1.2 All ESLint checks pass
- [ ] 9.1.3 Test suite executes successfully
- [ ] 9.1.4 Feature flag can disable semantic search
- [ ] 9.1.5 Embedding generation doesn't block document upload
- [ ] 9.1.6 RLS policies enforced for all vector queries

### 9.2 Deployment Validation
- [ ] 9.2.1 Deploy to staging environment
- [ ] 9.2.2 Run backfill script for existing data
- [ ] 9.2.3 Monitor API costs during testing
- [ ] 9.2.4 Verify recommendation quality
- [ ] 9.2.5 Test duplicate detection with real uploads

---

## Dependencies

**Can proceed in parallel**:
- Tasks 1.1 (embedding generation) and 2.1 (recommendation service)
- Tasks 3.1 (duplicate detection) and 4.1 (UI components)
- Tasks 7.1 (unit tests) and implementation

**Must wait for**:
- Task 5.1 requires 2.1 (recommendation service)
- Task 6.1 (backfill) requires 1.1 (embedding generation)
- Task 9 (validation) requires all previous tasks

**Critical Path**:
1.1 → 2.1 → 5.1 → 9
