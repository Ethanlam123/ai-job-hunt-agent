# Task Completion Checklist - AI Job Hunt Agent

## Pre-Completion Validation

### Code Quality Checks
```bash
# Run all code quality checks before considering task complete
npm run lint:strict      # Must pass with 0 warnings
npm run type-check       # Must have no TypeScript errors
npm run format:check     # Must be properly formatted
npm run test             # All tests must pass
```

### Database Validation (if applicable)
```bash
# If database changes were made
npm run db:studio        # Verify schema changes
npm run db:apply-rls     # Ensure RLS policies are applied
```

## Security & RLS Validation

### Critical Security Checks
- [ ] **RLS Policies Applied**: All database tables have proper Row Level Security
- [ ] **User Context**: All database operations use proper user authentication
- [ ] **Input Validation**: All user inputs are validated and sanitized
- [ ] **File Upload Security**: Document uploads have proper size and type restrictions
- [ ] **API Rate Limiting**: Rate limiting is implemented where appropriate

### RLS Policy Verification
```sql
-- Test RLS policies in Supabase SQL Editor
SELECT * FROM documents WHERE user_id = 'test-user-id'; -- Should return empty for wrong user
SELECT * FROM cache WHERE key LIKE 'user:wrong-user:%'; -- Should be empty
```

## Testing Requirements

### Test Coverage
- [ ] **Unit Tests**: New functions and classes have unit tests
- [ ] **Integration Tests**: Database operations and service integrations tested
- [ ] **E2E Tests**: Complete user workflows tested end-to-end
- [ ] **Security Tests**: Authentication and authorization tested

### Test Categories to Run
```bash
# Run appropriate test suites based on changes
npm run test                 # All unit tests
npm run test:integration     # Database and service integration
npm run test:e2e            # Full user workflows
npm run test:security       # Security and authentication
```

## Feature-Specific Validation

### CV Analysis Features
- [ ] **Document Parsing**: PDF/DOCX/TXT files parse correctly
- [ ] **Vector Embeddings**: CV content properly embedded and stored
- [ ] **Human Approval Loop**: All CV changes require user confirmation
- [ ] **Error Handling**: Graceful handling of malformed documents

### Interview Preparation
- [ ] **Question Generation**: Questions are relevant to CV content
- [ ] **Answer Evaluation**: Feedback is constructive and accurate
- [ ] **Document Integration**: Works with existing and new CV uploads

### Skill Gap Analysis
- [ ] **Timeline Organization**: Skills categorized by learning timeframes
- [ ] **Progress Tracking**: Users can update skill status correctly
- [ ] **Quality Validation**: Job description quality scoring works
- [ ] **Dynamic Categorization**: Skills properly categorized (technical/soft/domain)

### Document Management
- [ ] **File Upload**: All supported formats upload correctly
- [ ] **Preview Functionality**: Document previews display content
- [ ] **Storage Security**: Files stored with proper permissions
- [ ] **Duplicate Prevention**: Existing documents can be reused

## Performance & Scalability

### Performance Checks
- [ ] **Database Queries**: No N+1 queries, proper indexing
- [ ] **Vector Search**: Embedding search is optimized with caching
- [ ] **Bundle Size**: No unnecessary dependencies increasing bundle size
- [ ] **Server Load**: Long-running operations use background tasks

### Caching Strategy
- [ ] **User-Scoped Cache**: All cache keys properly scoped to users
- [ ] **TTL Management**: Cache entries have appropriate expiration
- [ ] **Cache Invalidation**: Cache invalidated when data changes

## Code Review Checklist

### Architecture & Design
- [ ] **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- [ ] **Repository Pattern**: Data access through proper repository abstractions
- [ ] **Service Layer**: Business logic encapsulated in services
- [ ] **Error Handling**: Consistent error handling throughout

### Code Standards
- [ ] **TypeScript**: Strict typing, no `any` types
- [ ] **Naming Conventions**: Consistent naming following project patterns
- [ ] **Import Organization**: Clean, organized imports
- [ ] **Documentation**: Complex functions documented with JSDoc

### Database Patterns
- [ ] **RLS Compliance**: All queries respect Row Level Security
- [ ] **Connection Management**: Proper database connection handling
- [ ] **Transaction Safety**: Multi-step operations use transactions
- [ ] **Schema Validation**: Data validated before database insertion

## Final Verification Steps

### Manual Testing Checklist
- [ ] **User Registration**: New users can register and authenticate
- [ ] **Document Upload**: Files upload and parse correctly
- [ ] **Feature Workflows**: All implemented features work end-to-end
- [ ] **Error States**: Graceful handling of errors and edge cases
- [ ] **Responsive Design**: UI works on different screen sizes

### Production Readiness
- [ ] **Environment Variables**: All required environment variables documented
- [ ] **Database Migration**: Schema changes can be applied cleanly
- [ ] **Build Process**: Application builds without errors
- [ ] **Security Headers**: Proper security headers configured

### Documentation Updates
- [ ] **API Documentation**: New endpoints documented with JSDoc
- [ ] **Component Documentation**: New components have proper documentation
- [ ] **README Updates**: Feature changes reflected in README
- [ ] **CLAUDE.md Updates**: Architecture changes documented

## Common Failure Points to Check

### Database Issues
- "Tenant or user not found" errors → Check RLS policies
- Connection timeouts → Check database configuration
- Missing embeddings → Check vector search service

### File Upload Issues
- Upload failures → Check storage permissions and file size limits
- Parse errors → Check document parser error handling
- Preview issues → Check content extraction and display

### AI/LLM Issues
- API failures → Check API keys and rate limits
- Slow responses → Check background job implementation
- Poor quality → Check prompt templates and model configuration

## Automated Pre-commit Hook (Optional)

Consider adding these checks to a pre-commit hook:
```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run lint:strict && npm run type-check && npm run format:check && npm run test
```

This ensures code quality before any commit is made.