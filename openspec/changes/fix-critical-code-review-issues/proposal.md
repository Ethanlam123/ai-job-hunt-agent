# Change: Fix Critical Code Review Issues

## Why

The codebase has **1 CRITICAL** and **4 HIGH** severity issues that block deployment and create significant security vulnerabilities. These issues were identified through a comprehensive AI-powered code review and include:

1. **CRITICAL**: Deleted client-side Supabase module breaking imports and causing type check failures
2. **HIGH**: Service role key accessible in production environments without validation
3. **HIGH**: SQL injection vulnerability in vector search service
4. **HIGH**: Weak cryptographic hash function for cache keys
5. **HIGH**: Broken test configuration preventing CI/CD pipeline execution

These issues violate the project's security-first principles and prevent the application from building, testing, or deploying safely.

## What Changes

### Security Fixes
- Implement production-safe elevated key validation with build-time and runtime checks (supports both legacy `service_role` and new `secret` API keys)
- Add support for Supabase's new Secret API keys (`sb_secret_...`) with improved browser protection
- Fix SQL injection vulnerability in vector search by using parameterized queries
- Replace weak DJB2 hash with SHA-256 cryptographic function for cache keys

### Build & Type Safety
- Restore or properly replace deleted `src/lib/supabase/client.ts` module
- Fix all TypeScript type checking errors (17 current failures)
- Fix ESLint configuration to include missing TypeScript plugin

### Test Configuration
- Install missing `vitest` dependency for test framework
- Fix test file type safety issues
- Remove non-existent methods from test assertions

### Error Handling
- Sanitize error messages to prevent database schema leakage
- Remove client-side console.log statements in production
- Implement proper error logging without exposing internals

### Performance & Memory
- Replace unbounded Map caches with LRU cache to prevent memory leaks
- Fix unnecessary delays in batch operations

## Impact

### Affected Specs
- **security** - Service role key validation, SQL injection prevention, error message sanitization
- **database** - Vector search security, cache key hashing, connection pooling
- **type-safety** - TypeScript strict mode compliance, client module imports
- **testing** - Test framework configuration, type-safe test assertions

### Affected Code
- `src/lib/supabase/client.ts` - **DELETED** (needs restoration or replacement)
- `src/lib/config/app-config.ts` - Elevated access key validation (both legacy and new formats)
- `src/lib/services/database-service.ts` - SQL injection fix
- `src/lib/services/vector-search-service.ts` - Hash function replacement
- `src/components/cv/approval-summary.tsx` - Import fix
- `src/__tests__/` - All test files
- `eslint.config.js` - Configuration fix
- `src/actions/documents.ts` - Error message sanitization
- `.env.example` - Updated with new Secret key format documentation

### Breaking Changes
None - All changes restore intended functionality or fix security vulnerabilities without changing public APIs.

### Migration Requirements
- Database migration required: `20260110000001_vector_search_rpc.sql` for SQL-safe vector search
- Environment variable changes needed:
  - Add `SUPABASE_SECRET_KEY` (recommended new format: `sb_secret_...`)
  - Legacy `SUPABASE_SERVICE_ROLE_KEY` still supported but deprecated
  - Both keys are blocked in production builds (security validation)
- Dependency installation required (vitest, @typescript-eslint/parser)

### Risk Assessment
- **Security Risk**: CRITICAL - SQL injection and service role key exposure
- **Deployment Risk**: HIGH - Build currently fails due to missing client module
- **Test Risk**: HIGH - Test suite cannot execute
- **Rollback Plan**: Git revert if issues arise (changes are isolated fixes)
