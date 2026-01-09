# Design: Fix Critical Code Review Issues

## Context

The AI Job Hunt Agent codebase has accumulated several critical security and build issues through recent commits. The most severe issues are:

1. **Deleted client module**: Commit 8e09658 removed `src/lib/supabase/client.ts` but `approval-summary.tsx` still imports it
2. **Service role key exposure**: Configuration allows service role key in production without validation
3. **SQL injection**: Vector search constructs raw SQL with user input
4. **Weak cryptography**: Cache keys use 32-bit DJB2 hash with high collision rate
5. **Broken build**: TypeScript fails with 17 errors, ESLint misconfigured

### Stakeholders
- **Development Team**: Needs working build and test suite
- **Security**: Requires production-safe service role key handling
- **Users**: Depend on secure data handling and RLS enforcement

### Constraints
- **Supabase-only data layer**: Must maintain PostgreSQL-based architecture
- **Serverless deployment**: Fixes must work on Vercel serverless functions
- **Backward compatibility**: Cannot break existing user workflows
- **No external dependencies**: Avoid adding new services or infrastructure

## Goals / Non-Goals

### Goals
- Restore functional build pipeline (TypeScript + ESLint passing)
- Fix all CRITICAL and HIGH security vulnerabilities
- Enable test suite execution
- Prevent service role key usage in production
- Implement production-ready cryptographic hashing
- Maintain RLS policy enforcement

### Non-Goals
- Adding new features or capabilities
- Changing database schema
- Refactoring working code (only fix identified issues)
- Performance optimizations beyond fixing bugs
- Adding monitoring or observability

## Decisions

### Decision 1: Restore Client-Side Supabase Module

**What**: Recreate `src/lib/supabase/client.ts` for browser components

**Why**:
- `approval-summary.tsx` is a client component that needs Supabase client
- Server-side client cannot be used in browser (different API)
- Removing the client would require rewriting component architecture

**Alternatives Considered**:
1. **Convert to Server Component** - Rejected: Component uses React hooks (`useState`, `useEffect`)
2. **Use direct API calls** - Rejected: Loses Supabase auth integration, increases complexity
3. **Pass data from server** - Rejected: Component manages interactive state client-side

**Implementation**:
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Rationale**: Minimal, standard implementation following Supabase SSR patterns.

---

### Decision 2: Multi-Layer Service Role Key Validation

**What**: Add validation at configuration loading, build time, and runtime

**Why**:
- Defense-in-depth prevents accidental exposure
- Build-time validation catches issues before deployment
- Runtime validation provides last line of defense
- Development and test environments need service role key for testing

**Alternatives Considered**:
1. **Environment variable omission** - Rejected: Tests need service role key
2. **Only runtime validation** - Rejected: Too late, deployment already happened
3. **Feature flags** - Rejected: Overkill, validation should always run

**Implementation**:
```typescript
// src/lib/config/app-config.ts
function loadConfig(): EnvironmentConfig {
  const config = EnvironmentConfigSchema.parse(process.env)

  // PRODUCTION SECURITY CHECK
  if (config.NODE_ENV === 'production' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SECURITY: SUPABASE_SERVICE_ROLE_KEY must not be available in production. ' +
      'This key bypasses Row Level Security (RLS) policies.'
    )
  }

  return config
}

// next.config.js (build-time validation)
const { validateConfig } = require('./src/lib/config/app-config')

if (process.env.NODE_ENV === 'production') {
  try {
    validateConfig()
  } catch (error) {
    if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      throw new Error(
        'Build failed: SUPABASE_SERVICE_ROLE_KEY is not allowed in production'
      )
    }
  }
}
```

**Rationale**: Three validation layers ensure defense-in-depth without breaking development/testing.

---

### Decision 3: Parameterized Queries via Supabase RPC

**What**: Replace raw SQL string construction with Supabase RPC function calls

**Why**:
- Eliminates SQL injection vulnerability
- Maintains PostgreSQL-based architecture
- Allows proper query plan caching
- Type-safe with TypeScript

**Alternatives Considered**:
1. **Input validation whitelist** - Rejected: Easy to miss edge cases, still risky
2. **ORM (Drizzle)** - Partial adoption: Better for new code, but requires migration
3. **Prepared statements** - Viable alternative but RPC is more idiomatic for Supabase

**Implementation**:
```sql
-- Create RPC function in Supabase
CREATE OR REPLACE FUNCTION vector_search(
  query_vector vector(1536),
  search_table text,
  vector_col text,
  similarity_threshold float,
  result_limit int
)
RETURNS table (
  id bigint,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format(
    'SELECT id, 1 - (%I <=> $1) as similarity
     FROM %I
     WHERE 1 - (%I <=> $1) > $2
     ORDER BY similarity DESC
     LIMIT $3',
    vector_col, search_table, vector_col
  )
  USING query_vector, similarity_threshold, result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// Usage in database-service.ts
const { data, error } = await supabase.rpc('vector_search', {
  query_vector: vector,
  search_table: 'cv_embeddings',
  vector_col: 'embedding',
  similarity_threshold: threshold,
  result_limit: limit
})
```

**Rationale**: PostgreSQL `format()` function with `SECURITY DEFINER` provides safe parameterization while maintaining performance.

---

### Decision 4: SHA-256 Hash for Cache Keys

**What**: Replace DJB2 hash with Node.js crypto module SHA-256

**Why**:
- Cryptographically secure (no practical collisions)
- Built-in Node.js module (no new dependencies)
- Fast enough for cache key generation
- Standard practice for security-sensitive hashing

**Alternatives Considered**:
1. **CRC32** - Rejected: Not cryptographically secure, still collision-prone
2. **MD5** - Rejected: Cryptographically broken
3. **External hash library** - Rejected: Unnecessary dependency
4. **UUID v4** - Rejected: No semantic relationship to input

**Implementation**:
```typescript
import crypto from 'crypto'

private hashText(text: string): string {
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('base64')
    .substring(0, 16) // First 16 chars for cache keys
}
```

**Rationale**: SHA-256 provides security with minimal performance impact. Truncating to 16 chars keeps cache keys short while maintaining collision resistance.

---

### Decision 5: LRU Cache for Memory Management

**What**: Replace unbounded Map with `lru-cache` library

**Why**:
- Prevents memory leaks from unbounded growth
- Automatic eviction of old entries
- Configurable size limits and TTL
- Widely used, battle-tested library

**Alternatives Considered**:
1. **Manual cache cleanup** - Rejected: Unreliable, easy to forget
2. **Redis** - Rejected: Violates "Supabase-only" constraint
3. **PostgreSQL cache table** - Rejected: Already using for persistent cache, need in-memory for speed

**Implementation**:
```typescript
import LRU from 'lru-cache'

private embeddingCache = new LRU<string, number[]>({
  max: 1000, // Maximum 1000 entries
  ttl: 1000 * 60 * 60, // 1 hour
})

private processingJobs = new LRU<string, EmbeddingJob>({
  max: 100,
  ttl: 1000 * 60 * 30, // 30 minutes
})
```

**Rationale**: Small, focused dependency that solves memory leak without architectural changes.

---

### Decision 6: Error Message Sanitization Pattern

**What**: Create centralized error handler that sanitizes before returning to clients

**Why**:
- Prevents database schema leakage
- Consistent error handling across codebase
- Maintains detailed logging server-side

**Alternatives Considered**:
1. **Try-catch at every endpoint** - Rejected: Inconsistent, easy to miss
2. **Error codes only** - Rejected: Poor user experience
3. **Expose all errors in dev** - Partially adopted: Use environment-aware logging

**Implementation**:
```typescript
// src/lib/utils/error-handler.ts
export class ErrorHandler {
  static sanitize(error: unknown, context?: Record<string, unknown>): ApplicationError {
    if (error instanceof ApplicationError) {
      return error
    }

    // Log full error server-side
    logger.error('Operation failed', { error, context })

    // Return sanitized message to client
    return new ApplicationError(
      'Operation failed. Please try again.',
      'OPERATION_FAILED',
      { originalMessage: process.env.NODE_ENV === 'development' ? String(error) : undefined }
    )
  }
}
```

**Rationale**: Centralized pattern ensures consistent security without sacrificing developer experience.

## Risks / Trade-offs

### Risk 1: Supabase RPC Function Migration
**Risk**: RPC function must be deployed to all environments (dev, staging, prod)

**Mitigation**:
- Include migration in database schema
- Test RPC function in isolation before using in code
- Document deployment steps

### Risk 2: Cache Key Changes Invalidation
**Risk**: SHA-256 hash produces different keys than DJB2, invalidating existing caches

**Mitigation**:
- Cache is in-memory only (lost on restart anyway)
- No persistent cache affected
- Consider this a cache warming operation

### Risk 3: Service Role Key Validation Breaking Tests
**Risk**: Some tests may rely on service role key in production-like environment

**Mitigation**:
- Update tests to use `NODE_ENV=test` instead of `production`
- Document test environment requirements
- Run test suite after validation implementation

### Risk 4: LRU Cache Dependency
**Risk**: Adding new dependency increases bundle size

**Mitigation**:
- `lru-cache` is small (~10KB minified)
- Only used server-side (not in client bundle)
- Widely adopted, well-maintained library

### Trade-off: Development vs Production Security
**Decision**: Allow service role key in development/test, block in production

**Rationale**:
- Developers need full database access for testing
- Production safety is non-negotiable
- Environment-based validation is standard practice

## Migration Plan

### Phase 1: Build System (Unblocks everything)
1. Fix ESLint configuration
2. Restore client-side Supabase module
3. Install missing test dependencies
4. Verify TypeScript compilation

### Phase 2: Security Fixes (Critical path)
1. Implement service role key validation
2. Create Supabase RPC function for vector search
3. Replace hash function
4. Sanitize error messages

### Phase 3: Memory & Performance
1. Add LRU cache dependency
2. Replace Map caches with LRU
3. Remove unnecessary delays in batch operations

### Phase 4: Test Suite
1. Fix test type errors
2. Remove non-existent methods
3. Verify all tests pass

### Rollback Plan
- Git revert if critical issues arise
- Each phase is independently revertable
- No database schema changes (except RPC function, easily dropped)

## Open Questions

### Q1: Should we use Drizzle ORM for all database operations?
**Status**: Deferred (out of scope)

**Rationale**: While desirable for consistency, full migration is beyond fixing critical issues. Addressed in future proposal.

### Q2: Should cache key hashing be configurable?
**Status**: No

**Rationale**: SHA-256 is standard practice. Configuration adds unnecessary complexity.

### Q3: Should we expose detailed errors in development mode?
**Status**: Yes, implemented in ErrorHandler

**Rationale**: Developer experience matters, but never in production.

## Dependencies

### Required Additions
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0"
  },
  "dependencies": {
    "lru-cache": "^10.0.0"
  }
}
```

### Database Changes
- Add `vector_search()` RPC function to Supabase project
- Grant execute permission to authenticated users

### Configuration Changes
- Add build-time validation to `next.config.js`
- Update `validateConfig()` in `app-config.ts`

## Testing Strategy

### Security Testing
- Verify service role key blocked in production
- Test SQL injection attempts against vector search
- Validate error message sanitization

### Integration Testing
- Test RPC function with various inputs
- Verify cache key uniqueness
- Test LRU cache eviction

### Regression Testing
- Run full test suite after each phase
- Verify no breaking changes to user workflows
- Check RLS policies still enforced

## Success Criteria

- All TypeScript type checking passes
- All ESLint checks pass
- Test suite executes successfully
- Service role key unusable in production
- SQL injection vulnerability eliminated
- Cache uses cryptographic hash
- No memory leaks from unbounded caches
- Error messages sanitized in production
