## ADDED Requirements

### Requirement: JSON Parsing Resilience
The CV Agent SHALL handle malformed LLM JSON responses gracefully through multi-stage parsing with fallback strategies.

#### Scenario: Control character cleanup
- **WHEN** LLM returns JSON with embedded control characters
- **THEN** system removes control characters and normalizes whitespace
- **AND** attempts standard JSON parsing

#### Scenario: Aggressive parsing fallback
- **WHEN** standard parsing fails due to formatting issues
- **THEN** system applies aggressive cleaning (trailing commas, escaped characters)
- **AND** attempts parsing again

#### Scenario: Regex extraction fallback
- **WHEN** JSON structure is severely malformed
- **THEN** system extracts improvement arrays using regex patterns
- **AND** constructs valid JSON from extracted content

#### Scenario: Structured fallback improvements
- **WHEN** all parsing attempts fail
- **THEN** system provides meaningful structured fallback improvements
- **AND** includes actionable suggestions for common CV issues

### Requirement: Database Schema Compliance
The approval records SHALL include all required database fields with proper constraint validation.

#### Scenario: Approval record creation
- **WHEN** converting improvements to approval records
- **THEN** system maps all required fields (priority, sort_order)
- **AND** satisfies database constraints without violations

#### Scenario: Priority field validation
- **WHEN** storing approval records with priority
- **THEN** system uses only allowed values ('high', 'medium', 'low')
- **AND** maps LLM priorities to valid database values

### Requirement: Priority Mapping System
The system SHALL map LLM priority levels to database-allowed values through intelligent conversion.

#### Scenario: Critical priority mapping
- **WHEN** LLM generates improvement with 'critical' priority
- **THEN** system maps to 'high' priority for database storage
- **AND** preserves urgency indication in UI display

#### Scenario: Unknown priority handling
- **WHEN** LLM generates unrecognized priority level
- **THEN** system defaults to 'medium' priority
- **AND** logs the unmapped priority for debugging

## MODIFIED Requirements

### Requirement: Improvement Generation Pipeline
The CV analysis SHALL generate improvements with comprehensive validation and proper field mapping.

#### Scenario: Approval record creation
- **WHEN** CV analysis completes successfully
- **THEN** system creates approval records for all improvements
- **AND** includes all required database fields with proper mapping

#### Scenario: Field mapping preservation
- **WHEN** converting improvement objects to database records
- **THEN** system preserves all original improvement data in proposed_content
- **AND** adds derived fields (improvementType, jobContext) for workflow tracking

### Requirement: Approval Workflow Functionality
Users SHALL be able to approve or reject individual improvements with immediate visual feedback.

#### Scenario: Approval action
- **WHEN** user clicks approve button for an improvement
- **THEN** system updates approval status to 'approved'
- **AND** removes item from pending improvements list
- **AND** shows success feedback to user

#### Scenario: Rejection action
- **WHEN** user clicks reject button with optional feedback
- **THEN** system updates approval status to 'rejected'
- **AND** stores user feedback if provided
- **AND** removes item from pending improvements list

#### Scenario: Pending improvements filtering
- **WHEN** displaying approval interface
- **THEN** system shows only improvements with 'pending' status
- **AND** filters out approved and rejected items automatically

### Requirement: Error Handling and Recovery
The system SHALL provide comprehensive error handling with meaningful user feedback.

#### Scenario: Database constraint violations
- **WHEN** database operation fails due to constraint violation
- **THEN** system logs detailed error information
- **AND** provides user-friendly error message
- **AND** attempts recovery with mapped values

#### Scenario: LLM service failures
- **WHEN** LLM service becomes unavailable during analysis
- **THEN** system provides cached or fallback improvements
- **AND** informs user about service limitations

## Implementation Details

### Database Schema Updates
```sql
ALTER TABLE approvals ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE approvals ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
```

### JSON Parsing Pipeline
1. Primary parsing with basic cleaning
2. Aggressive cleaning for malformed content
3. Regex extraction for severely malformed responses
4. Structured fallback improvements as final resort

### Priority Mapping Logic
- 'critical', 'urgent' → 'high'
- 'medium', 'important', 'normal' → 'medium'
- 'low', 'nice-to-have' → 'low'
- Unknown values → 'medium' (default)

### Approval Record Structure
- All LLM improvement fields preserved in `proposed_content`
- Database-required fields properly mapped (`priority`, `sort_order`)
- Metadata fields for workflow tracking (`improvementType`, `jobContext`)

## Testing Strategy

### Unit Tests
- JSON parsing with various malformed inputs
- Priority mapping function validation
- Database constraint compliance testing

### Integration Tests
- End-to-end CV analysis workflow
- Approval/reject functionality
- Error recovery scenarios

### User Acceptance Tests
- Multiple improvement display and interaction
- Visual feedback for approval actions
- Error handling transparency

## Success Metrics

- 100% of CV analysis sessions generate approval records
- 95%+ of LLM responses parse successfully (including fallbacks)
- Zero database constraint violations during approval creation
- Complete approval/reject workflow functionality
- User satisfaction with improvement quality and interaction