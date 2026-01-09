## ADDED Requirements

### Requirement: Service Role Key Production Validation
The system SHALL prevent the use of `SUPABASE_SERVICE_ROLE_KEY` in production environments to ensure Row Level Security (RLS) policies cannot be bypassed.

#### Scenario: Production build fails with service role key
- **WHEN** a production build is attempted with `SUPABASE_SERVICE_ROLE_KEY` set
- **THEN** the build SHALL fail immediately with a descriptive error message
- **AND** the error message SHALL explain that service role key is not allowed in production

#### Scenario: Development environment allows service role key
- **WHEN** `NODE_ENV` is set to `development` or `test`
- **THEN** the system SHALL allow `SUPABASE_SERVICE_ROLE_KEY` to be used
- **AND** a warning SHALL be logged if service role key is missing in development

#### Scenario: Runtime validation blocks service role key
- **WHEN** the application starts in production mode with service role key available
- **THEN** the application SHALL throw an error during initialization
- **AND** the error SHALL prevent the application from starting

---

### Requirement: SQL Injection Prevention in Vector Search
The system SHALL prevent SQL injection attacks in vector search operations through parameterized queries and input validation.

#### Scenario: Malicious table name rejected
- **WHEN** a vector search request contains a malicious table name (e.g., `documents; DROP TABLE users; --`)
- **THEN** the system SHALL reject the request with a validation error
- **AND** the request SHALL NOT reach the database

#### Scenario: Whitelist validation for table names
- **WHEN** a vector search request specifies a table name
- **THEN** the system SHALL validate the table name against an allowed list
- **AND** only known safe table names SHALL be accepted

#### Scenario: Parameterized queries for user input
- **WHEN** executing a vector search query
- **THEN** the system SHALL use parameterized queries or Supabase RPC functions
- **AND** user input SHALL NOT be concatenated into SQL strings

---

### Requirement: Error Message Sanitization
The system SHALL prevent database schema leakage through error messages returned to clients.

#### Scenario: Database errors sanitized for clients
- **WHEN** a database operation fails
- **THEN** the error message returned to the client SHALL be generic
- **AND** the error message SHALL NOT contain table names, column names, or constraint details
- **AND** the full error details SHALL be logged server-side for debugging

#### Scenario: Development mode shows detailed errors
- **WHEN** `NODE_ENV` is set to `development`
- **THEN** the system MAY include detailed error information in responses
- **AND** production environments SHALL NEVER expose internal error details

---

### Requirement: Client-Side Logging Restrictions
The system SHALL not log sensitive information to the browser console in production builds.

#### Scenario: Production builds exclude console statements
- **WHEN** the application runs in production mode
- **THEN** client-side `console.log()` statements SHALL be removed or disabled
- **AND** no sensitive data SHALL be output to the browser console

#### Scenario: Development allows console logging
- **WHEN** `NODE_ENV` is set to `development`
- **THEN** console logging SHALL be allowed for debugging
- **AND** developers MAY see diagnostic information in the browser console

---

## REMOVED Requirements

### Requirement: Weak Hash Function for Cache Keys
**Reason**: The DJB2 hash function has high collision rates and is not cryptographically secure, creating security and performance risks.

**Migration**: Replace DJB2 hash with SHA-256 cryptographic hash function. The cache key format will change, which will invalidate existing in-memory caches (acceptable as caches are ephemeral).

**Previous Behavior**: The system used a 32-bit DJB2-style hash for cache keys, which had high collision rates and was predictable.

**New Behavior**: The system uses SHA-256 hash truncated to 16 characters for cache keys, providing cryptographic security and eliminating practical collisions.
