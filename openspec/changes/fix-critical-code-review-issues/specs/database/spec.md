## ADDED Requirements

### Requirement: Cryptographic Cache Key Generation
The system SHALL use cryptographically secure hash functions for generating cache keys to prevent collision attacks and ensure cache integrity.

#### Scenario: SHA-256 hash for cache keys
- **WHEN** generating a cache key from text input
- **THEN** the system SHALL use the SHA-256 hash algorithm
- **AND** the output SHALL be truncated to 16 characters for key storage
- **AND** the hash SHALL be generated using Node.js built-in `crypto` module

#### Scenario: Consistent hash for same input
- **WHEN** the same input text is hashed multiple times
- **THEN** the system SHALL produce identical hash values each time
- **AND** cache lookups using the hash SHALL consistently succeed

#### Scenario: Different hashes for different inputs
- **WHEN** two different text inputs are hashed
- **THEN** the system SHALL produce different hash values with high probability
- **AND** practical collisions SHALL be eliminated (SHA-256 collision resistance)

---

### Requirement: LRU Cache for Memory Management
The system SHALL use LRU (Least Recently Used) cache with configurable size limits and TTL to prevent memory leaks from unbounded cache growth.

#### Scenario: Cache eviction at max size
- **WHEN** the cache reaches its maximum configured size
- **THEN** the least recently used entries SHALL be automatically evicted
- **AND** the cache size SHALL NOT exceed the configured maximum

#### Scenario: TTL expiration
- **WHEN** a cache entry exceeds its configured time-to-live (TTL)
- **THEN** the entry SHALL be automatically removed from the cache
- **AND** attempts to access the entry SHALL return cache miss

#### Scenario: Configurable cache limits
- **WHEN** configuring cache instances
- **THEN** the system SHALL support setting maximum size and TTL parameters
- **AND** different cache types MAY have different configurations (e.g., embeddings vs jobs)

---

### Requirement: Vector Search via Supabase RPC
The system SHALL execute vector similarity searches through Supabase RPC functions to ensure parameterized query safety and prevent SQL injection.

#### Scenario: RPC function for vector search
- **WHEN** performing a vector similarity search
- **THEN** the system SHALL call a Supabase RPC function with parameters
- **AND** the query SHALL be constructed using PostgreSQL `format()` function
- **AND** user input SHALL be passed as parameters, not concatenated into SQL

#### Scenario: Vector search results ordered by similarity
- **WHEN** a vector search completes successfully
- **THEN** results SHALL be ordered by similarity score in descending order
- **AND** results below the similarity threshold SHALL be excluded
- **AND** results SHALL be limited to the specified count

---

## REMOVED Requirements

### Requirement: Unbounded Map Cache
**Reason**: Unbounded Map growth causes memory leaks in long-running serverless functions.

**Migration**: Replace JavaScript Map with LRU cache library. Existing cache entries are in-memory only and will be lost on restart, which is acceptable behavior.

**Previous Behavior**: Cache used native JavaScript Map with no size limits or automatic eviction, causing unbounded memory growth.

**New Behavior**: Cache uses LRU library with configurable max size and TTL, automatically evicting old entries.
