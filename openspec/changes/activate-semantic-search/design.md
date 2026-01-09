# Design: Activate Semantic Search with Embeddings

## Context

The codebase has a **complete but dormant embedding infrastructure**:
- Database tables with pgvector columns (`cv_embeddings`, `job_descriptions`)
- Vector search service with LRU caching and SQL injection protection
- Configuration for Qwen embeddings via OpenRouter
- Security features (RLS, input validation, error handling)

However, **embeddings are never generated** during document processing workflows. The infrastructure is ready but unused.

### Stakeholders
- **Users**: Want intelligent job recommendations and better CV-job matching
- **Development**: Need to activate existing infrastructure without major refactoring
- **Business**: Enhanced user experience through semantic matching

### Constraints
- **Cost**: Qwen embeddings via OpenRouter (cost-effective, but still has API costs)
- **Performance**: Embedding generation adds latency to document upload
- **Privacy**: All embeddings must respect RLS policies (user-scoped)
- **No Schema Changes**: Must work with existing tables

## Goals / Non-Goals

### Goals
- Generate embeddings for CV sections during upload
- Generate embeddings for job descriptions during analysis
- Provide job recommendations based on CV similarity
- Enable duplicate document detection
- Keep existing functionality working (backward compatible)

### Non-Goals
- Changing embedding model (Qwen 8B is already configured)
- Modifying database schema (tables already have vector columns)
- Rebuilding vector search service (just activate it)
- External job board integration (focus on user-uploaded JDs)

## Decisions

### Decision 1: When to Generate CV Embeddings

**What**: Generate embeddings for CV sections immediately after document parsing

**Why**:
- Fresh embeddings when CV is uploaded
- User can immediately get job recommendations
- Section-based embeddings allow granular matching

**Alternatives Considered**:
1. **On-demand generation** - Rejected: Adds latency to job search
2. **Background job** - Rejected: Adds complexity, users want immediate results
3. **Scheduled batch** - Rejected: Stale data, poor UX

**Implementation**:
```typescript
// In document-parser.ts after parseDocument()
if (documentType === 'cv') {
  await generateCVSectionEmbeddings(documentId, parsedContent, userId)
}

async function generateCVSectionEmbeddings(
  documentId: string,
  parsedContent: ParsedContent,
  userId: string
) {
  const sections = extractSections(parsedContent)
  const embeddings = await vectorSearchService.generateBatchEmbeddings(
    sections.map(s => s.content)
  )

  await db.insert(cvEmbeddings).values(
    sections.map((section, i) => ({
      documentId,
      userId,
      sectionType: section.type,
      content: section.content,
      embedding: embeddings[i],
    }))
  )
}
```

**Rationale**: Straightforward integration into existing upload flow, minimal latency impact with caching.

---

### Decision 2: When to Generate Job Description Embeddings

**What**: Generate embeddings for job descriptions when analyzed in skill gap workflow

**Why**:
- Job descriptions are entered during skill gap analysis
- Generates embedding for similarity matching
- Only processes JDs user actively analyzes

**Alternatives Considered**:
1. **Generate on paste** - Rejected: User might paste multiple JDs, waste API calls
2. **Generate on submit** - CHOSEN: User intent clear, single JD per analysis

**Implementation**:
```typescript
// In skill-gap-agent.ts, after job description analysis
if (jobDescriptionEmbedding) {
  const embedding = await vectorSearchService.generateEmbedding(
    jobDescriptionText,
    { model: APP_CONSTANTS.LLM_MODELS.EMBEDDINGS }
  )

  await db.update(jobDescriptions)
    .set({ embedding })
    .where(eq(jobDescriptions.id, jdId))
}
```

**Rationale**: Tied to user action, single embedding per analysis, cost-effective.

---

### Decision 3: Job Recommendation Algorithm

**What**: Use cosine similarity with configurable threshold and filters

**Why**:
- Cosine similarity is standard for text embeddings
- Threshold filters irrelevant matches
- User-scoped search respects RLS

**Alternatives Considered**:
1. **Euclidean distance** - Rejected: Less effective for text embeddings
2. **Dot product** - Rejected: Requires normalized vectors
3. **Hybrid approach** - Rejected: Unnecessary complexity for MVP

**Implementation**:
```typescript
async function recommendJobs(
  cvEmbedding: number[],
  userId: string,
  options: {
    threshold?: number      // Default: 0.65
    limit?: number          // Default: 10
    sectionType?: string[]  // Filter by CV section
  } = {}
) {
  const threshold = options.threshold ?? 0.65
  const limit = options.limit ?? 10

  // Use existing vector search service
  const results = await vectorSearchService.vectorSearch(
    cvEmbedding,
    'cv_embeddings',
    'embedding',
    {
      threshold,
      limit,
      whereClause: `user_id = '${userId}'` // RLS enforcement
    }
  )

  return results
}
```

**Rationale**: Leverages existing infrastructure, RLS-safe, proven approach.

---

### Decision 4: Duplicate Detection Strategy

**What**: Use similarity threshold of 0.95 for duplicate detection

**Why**:
- High threshold catches near-duplicates (re uploads, minor edits)
- File hash alone misses "same content, different file" cases
- Helps users avoid redundant uploads

**Alternatives Considered**:
1. **Exact text matching** - Rejected: Misses near-duplicates
2. **Lower threshold (0.85)** - Rejected: Too many false positives
3. **File clustering** - Rejected: Over-complexity for this use case

**Implementation**:
```typescript
async function checkDuplicates(
  embedding: number[],
  userId: string,
  excludeId?: string
) {
  const results = await vectorSearchService.vectorSearch(
    embedding,
    'cv_embeddings',
    'embedding',
    {
      threshold: 0.95,
      limit: 5,
      whereClause: excludeId
        ? `user_id = '${userId}' AND document_id != '${excludeId}'`
        : `user_id = '${userId}'`
    }
  )

  return results.records.map(r => r.documentId)
}
```

**Rationale**: High threshold minimizes false positives, simple and effective.

---

### Decision 5: Error Handling & Fallbacks

**What**: Graceful degradation when embedding generation fails

**Why**:
- API failures shouldn't block document upload
- Users can still use text-based features
- Clear error messaging for debugging

**Alternatives Considered**:
1. **Fail fast** - Rejected: Blocks upload, poor UX
2. **Silent failure** - Rejected: No feedback, confusion
3. **Retry with exponential backoff** - CHOSEN: Balance resilience and UX

**Implementation**:
```typescript
async function generateEmbeddingsWithRetry(
  texts: string[],
  maxRetries = 3
): Promise<number[] | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await vectorSearchService.generateBatchEmbeddings(texts)
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error('Embedding generation failed after retries', { error })
        return null // Signal failure but don't throw
      }
      await sleep(Math.pow(2, attempt) * 1000) // Exponential backoff
    }
  }
}
```

**Rationale**: Resilient to transient failures, clear failure signal without throwing.

---

### Decision 6: Cost Management

**What**: Implement caching and batching to minimize API costs

**Why**:
- Qwen embeddings via OpenRouter have per-call costs
- Re-uploads of same content shouldn't regenerate embeddings
- Batch processing reduces per-token overhead

**Cost Estimates**:
- Qwen 8B via OpenRouter: ~$0.0001 per 1K tokens
- CV with 5 sections (~2000 tokens): ~$0.0002 per CV
- 1000 CVs: ~$0.20
- Job description (~500 tokens): ~$0.00005 per JD

**Alternatives Considered**:
1. **No caching** - Rejected: Wastes money on re-uploads
2. **Local model** - Rejected: Infrastructure complexity
3. **OpenAI embeddings** - Rejected: More expensive than Qwen

**Implementation**:
- LRU cache for recent embeddings (1000 entries, 1 hour TTL)
- PostgreSQL cache for long-term storage (user-scoped keys)
- Batch section embeddings together (reduce API calls)

**Rationale**: Cost-effective approach with existing infrastructure.

---

## Risks / Trade-offs

### Risk 1: Increased Upload Latency
**Risk**: Embedding generation adds 1-3 seconds to CV upload

**Mitigation**:
- Async processing (don't block document save)
- Show "Processing embeddings..." indicator
- Cache embeddings for re-uploads

### Risk 2: API Cost Accumulation
**Risk**: Frequent uploads and JD analysis increase costs

**Mitigation**:
- Aggressive caching (LRU + PostgreSQL)
- Batch processing where possible
- Monitor usage and implement rate limits if needed
- Feature flag to disable if costs unsustainable

### Risk 3: Embedding Quality Degradation
**Risk**: Qwen 8B may produce lower quality embeddings than OpenAI

**Mitigation**:
- Similarity threshold tuning (start conservative at 0.65)
- User feedback mechanism (relevant/irrelevant recommendations)
- A/B test different models if quality issues arise
- Fallback to text-based search if needed

### Risk 4: Database Size Growth
**Risk**: Vector columns (1536 dimensions) increase storage requirements

**Mitigation**:
- Each embedding is ~6KB (1536 * 4 bytes)
- 1000 CV sections = ~6MB (acceptable)
- Periodic cleanup of old embeddings
- Monitor storage costs

## Migration Plan

### Phase 1: Core Embedding Generation (Week 1)
1. Add embedding generation to document parser service
2. Add embedding generation to skill gap workflow
3. Test with sample documents
4. Monitor API costs and latency

### Phase 2: Job Recommendations (Week 2)
1. Create job recommendation service
2. Add `/api/jobs/recommend` endpoint
3. Add "Recommended Jobs" section to dashboard
4. A/B test similarity thresholds

### Phase 3: Duplicate Detection (Week 2)
1. Add duplicate check during upload
2. Show warning if similar document exists
3. Add "Skip duplicate" option for user

### Phase 4: Backfill & Optimization (Week 3)
1. Backfill embeddings for existing documents
2. Optimize caching strategy based on usage patterns
3. Add monitoring and alerting
4. Update documentation

### Rollback Plan
- Feature flag in `app-config.ts`: `ENABLE_SEMANTIC_SEARCH`
- If disabled, skip embedding generation, use text-based search only
- No database changes to rollback (just don't generate embeddings)

## Open Questions

### Q1: Similarity Threshold?
**Status**: Start with 0.65, tune based on user feedback

**Rationale**: Conservative threshold ensures quality matches, can be adjusted.

### Q2: Number of Recommendations?
**Status**: Default to 10, allow user to load more

**Rationale**: Balance between relevance and choice.

### Q3: Should we store section embeddings or full CV embeddings?
**Status**: Store section embeddings for granularity

**Rationale**: Allows section-level matching (e.g., "find jobs matching my skills section").

### Q4: How often to refresh embeddings?
**Status**: Generate once on upload, regenerate on CV update

**Rationale**: Embeddings don't change unless content changes.

## Performance Considerations

### Embedding Generation Latency
- Single section: ~500ms
- CV with 5 sections: ~1-2s (batch processing)
- Job description: ~500ms

### Caching Effectiveness
- LRU cache hit rate: Expected ~30-40% (re-uploads)
- PostgreSQL cache hit rate: Expected ~60-70% (repeat queries)
- Combined hit rate: ~80%+ after warmup

### Database Query Performance
- Vector similarity search: ~100-200ms (with indexes)
- RLS filtering overhead: ~50ms
- Total recommendation query: ~150-250ms

### Cost Projections
- Per 1000 active users with 5 CVs each: ~$1/month
- Per 1000 skill gap analyses/month: ~$0.05/month
- **Total estimated cost**: ~$1.05/month per 1000 users

## Security Considerations

### RLS Policy Enforcement
- All embedding queries include `user_id` filter
- Vector search service validates table/column names
- No cross-user embedding access

### API Key Security
- OpenRouter API key stored in environment variable
- Never logged or exposed in error messages
- Service role key NOT used for embedding generation

### Data Minimization
- Only embed content necessary for search
- No embedding of sensitive personal information
- Embeddings deleted when document deleted (cascade)
