# Spec: User Profile

## Capability Overview

User profile provides account management and preferences configuration. Enhanced with model preferences to allow users to customize AI model selection per feature.

## ADDED Requirements

### Requirement: Model Preferences

The system SHALL allow users to customize which OpenRouter AI models are used for each feature.

**Priority**: MEDIUM
**Status**: NEW

**Functional Requirements**:
- UP-001.1: Provide text input for model ID entry per feature
- UP-001.2: Support model preferences for CV Analysis, Interview Preparation, Skill Gap Analysis, Cover Letter Generation
- UP-001.3: Validate model ID format before saving
- UP-001.4: Fall back to system default for invalid or unset preferences
- UP-001.5: Persist preferences in database with RLS protection

**Non-Functional Requirements**:
- UP-001.6: Model ID validation regex: `^[a-z0-9_-]+\/[a-z0-9_.-]+(?::[a-z0-9_.-]+)?$`
- UP-001.7: Maximum model ID length: 200 characters
- UP-001.8: Empty value means "use system default"
- UP-001.9: Preferences load in <100ms

#### Scenario: Set model preference for CV Analysis

**Given** a user is logged in
**And** the user navigates to profile settings
**When** the user enters `openai/gpt-4o-mini` in the CV Analysis field
**And** the user clicks Save
**Then** the preference is saved to the database
**And** future CV analyses use `openai/gpt-4o-mini`

#### Scenario: Use free model for cost optimization

**Given** a user wants to minimize API costs
**When** the user enters `nvidia/nemotron-3-nano-30b-a3b:free` for Interview Preparation
**And** the user saves their preferences
**Then** interview preparation uses the free model
**And** no API costs are incurred for that feature

#### Scenario: Invalid model ID is rejected

**Given** a user is on the profile settings page
**When** the user enters an invalid model ID format
**And** the user attempts to save
**Then** a validation error is displayed
**And** the invalid preference is not saved
**And** the field is highlighted with error state

#### Scenario: Empty field uses system default

**Given** a user has set a custom model preference
**When** the user clears the model ID field
**And** the user saves
**Then** the preference is removed from database
**And** future operations use the system default model

#### Scenario: User can only access own preferences

**Given** user A has saved model preferences
**And** user B is logged in
**When** user B attempts to access user A's preferences
**Then** the request is blocked by RLS policy
**And** user B sees only their own preferences

### Requirement: Model ID Validation

The system SHALL validate OpenRouter model ID format before accepting user input.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- UP-002.1: Validate format using regex pattern
- UP-002.2: Reject empty provider or model name
- UP-002.3: Reject special characters and spaces
- UP-002.4: Reject path traversal attempts
- UP-002.5: Enforce maximum length of 200 characters

**Non-Functional Requirements**:
- UP-002.6: Validation completes in <10ms
- UP-002.7: Clear error message for invalid format
- UP-002.8: Sanitize input (trim whitespace, lowercase)

#### Scenario: Valid model ID formats are accepted

**Given** a user enters a model ID
**When** the format is `provider/model` (e.g., `openai/gpt-4o-mini`)
**Then** the validation passes
**And** the model ID is accepted

**Given** a user enters a model ID
**When** the format is `provider/model:tag` (e.g., `google/gemini-2.0-flash-exp:free`)
**Then** the validation passes
**And** the model ID is accepted

#### Scenario: Invalid formats are rejected

**Given** a user enters a model ID
**When** the format contains no slash (e.g., `gpt-4o`)
**Then** the validation fails
**And** an error message is displayed

**Given** a user enters a model ID
**When** the format contains path traversal (e.g., `../../etc/passwd`)
**Then** the validation fails
**And** an error message is displayed

**Given** a user enters a model ID
**When** the format exceeds 200 characters
**Then** the validation fails
**And** an error message is displayed

### Requirement: Agent Model Selection

The system SHALL use user's preferred model when executing AI agent workflows.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- UP-003.1: Fetch user's model preference at agent initialization
- UP-003.2: Use preferred model for LLM operations
- UP-003.3: Fall back to system default if preference not set
- UP-003.4: Log which model is being used
- UP-003.5: Handle missing preferences gracefully

**Non-Functional Requirements**:
- UP-003.6: Preference fetch adds <20ms latency
- UP-003.7: Invalid model ID in DB falls back to default
- UP-003.8: Agent failure doesn't crash application

#### Scenario: CV agent uses user's preferred model

**Given** a user has set `openai/gpt-4o` for CV Analysis
**When** the user runs a CV analysis
**Then** the CV agent fetches the preference
**And** initializes LLM with `openai/gpt-4o`
**And** the analysis completes successfully

#### Scenario: Fallback to default when no preference set

**Given** a user has never set model preferences
**When** the user runs a skill gap analysis
**Then** the skill gap agent checks for preferences
**And** finds no preference set
**And** uses the system default model

#### Scenario: Invalid stored model ID falls back

**Given** a user has a corrupted model preference in database
**When** an agent attempts to use the preference
**Then** the invalid format is detected
**And** the system default is used instead
**And** an error is logged for debugging

### Requirement: Preferences Persistence

The system SHALL persist user preferences in a database table with RLS protection.

**Priority**: HIGH
**Status**: NEW

**Functional Requirements**:
- UP-004.1: Create `user_profiles` table with `preferences` JSONB column
- UP-004.2: Enable Row Level Security on the table
- UP-004.3: Create RLS policies for user-scoped access
- UP-004.4: Upsert preferences on save
- UP-004.5: Cascade delete when user is deleted

**Non-Functional Requirements**:
- UP-004.6: Preferences save completes in <100ms
- UP-004.7: Indexed lookup by user_id
- UP-004.8: JSONB allows flexible preference structure

#### Scenario: Save preferences to database

**Given** a user is logged in
**When** the user saves model preferences
**Then** the preferences are stored in `user_profiles.preferences`
**And** the `user_id` matches the authenticated user
**And** `updated_at` timestamp is set

#### Scenario: Load preferences from database

**Given** a user has saved preferences
**When** the profile page loads
**Then** the preferences are fetched from database
**And** the form is populated with saved values
**And** only the current user's preferences are accessible

#### Scenario: RLS prevents cross-user access

**Given** user A has preferences saved
**And** user B is logged in
**When** user B tries to fetch user A's preferences
**Then** the RLS policy blocks the request
**And** no data is returned

## Dependencies

### Internal Dependencies
- `user_profiles` table - Stores user preferences
- `user.repository.ts` - User profile data access
- `llm-service.ts` - Model selection helper
- `cv-agent.ts` - CV analysis with model preference
- `interview-agent.ts` - Interview prep with model preference
- `skill-gap-agent.ts` - Skill gap with model preference
- `cover-letter-service.ts` - Cover letter with model preference

### External Dependencies
- OpenRouter API - Validates model availability (implicitly through usage)
- Supabase Postgres - Stores preferences with RLS

## Database Schema

```typescript
// User Profiles (new table)
export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references('users', { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  location: varchar('location', { length: 255 }),
  bio: text('bio'),
  website: varchar('website', { length: 500 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  githubUrl: varchar('github_url', { length: 500 }),
  preferences: jsonb('preferences').$type<{
    email_notifications: boolean
    marketing_emails: boolean
    theme: 'light' | 'dark' | 'system'
    language: string
    models?: {
      cv_analysis?: string
      interview_preparation?: string
      skill_gap_analysis?: string
      cover_letter_generation?: string
    }
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// RLS Policies
// - Users can view own profile: auth.uid() = user_id
// - Users can insert own profile: auth.uid() = user_id
// - Users can update own profile: auth.uid() = user_id
```

## API Endpoints

### Server Actions (NEW)

```typescript
// Get user's model preferences
export async function getModelPreferences(): Promise<ModelPreferences | null>

// Save user's model preferences
export async function saveModelPreferences(
  preferences: ModelPreferences
): Promise<{ success: boolean; error?: string; invalidFields?: string[] }>

// Validate a model ID format
export async function validateModelId(
  modelId: string
): Promise<{ valid: boolean; error?: string }>

type ModelPreferences = {
  cv_analysis?: string
  interview_preparation?: string
  skill_gap_analysis?: string
  cover_letter_generation?: string
}
```

## Testing Requirements

### Unit Tests
- UP-T001: Test model ID validation with valid inputs
- UP-T002: Test model ID validation with invalid inputs
- UP-T003: Test sanitization (trim, lowercase)
- UP-T004: Test max length enforcement
- UP-T005: Test empty string handling

### Integration Tests
- UP-T006: Save and load model preferences
- UP-T007: Test RLS policies prevent cross-user access
- UP-T008: Test fallback to default for invalid preferences
- UP-T009: Test upsert creates new profile if not exists

### E2E Tests
- UP-T010: Complete flow: set preference, use feature, verify model used
- UP-T011: Test validation error prevents invalid save
- UP-T012: Test clearing preference reverts to default

## UI Components

### New Components
- `model-preferences-form.tsx` - Form for entering model preferences

### Enhanced Components
- `profile/page.tsx` - Add model preferences section

## Rollback Plan

Remove preference fetching in agents:
- Comment out `getUserPreferredModel()` calls
- Agents revert to using `APP_CONSTANTS.LLM_MODELS.DEFAULT`
- Hide model preferences form from profile page
- Users continue with system default model

## Future Enhancements (Out of Scope)

- UP-F001: Model performance benchmarking
- UP-F002: Cost estimation per model
- UP-F003: Model testing/validation against OpenRouter API
- UP-F004: Model recommendation engine
- UP-F005: Usage analytics per model
- UP-F006: Model marketplace/discovery UI
