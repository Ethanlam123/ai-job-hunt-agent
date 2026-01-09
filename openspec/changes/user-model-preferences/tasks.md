# Implementation Tasks

## 1. Database Layer

### 1.1 Create User Profiles Table

#### 1.1.1 Create Migration File
- [ ] 1.1.1.1 Create `src/lib/db/migrations/0005_add_user_profiles.sql`
- [ ] 1.1.1.2 Define `user_profiles` table schema
- [ ] 1.1.1.3 Add `preferences` JSONB column with default
- [ ] 1.1.1.4 Add foreign key to `users` table
- [ ] 1.1.1.5 Add timestamps (`created_at`, `updated_at`)

**Files**: `src/lib/db/migrations/0005_add_user_profiles.sql`

**Validation**: SQL syntax is valid

---

#### 1.1.2 Add RLS Policies
- [ ] 1.1.2.1 Enable Row Level Security on `user_profiles`
- [ ] 1.1.2.2 Create SELECT policy for own profile
- [ ] 1.1.2.3 Create INSERT policy for own profile
- [ ] 1.1.2.4 Create UPDATE policy for own profile
- [ ] 1.1.2.5 Add CASCADE delete for foreign key

**Files**: `src/lib/db/migrations/0005_add_user_profiles.sql`

**Validation**: RLS policies prevent cross-user access

---

#### 1.1.3 Run Migration
- [ ] 1.1.3.1 Apply migration to development database
- [ ] 1.1.3.2 Verify table created successfully
- [ ] 1.1.3.3 Test RLS policies with different users

**Files**: Database

**Validation**: Table exists, RLS works correctly

---

## 2. Type Definitions

### 2.1 Create Model Preference Types

#### 2.1.1 Create Type Definitions File
- [ ] 2.1.1.1 Create `src/lib/types/model-preferences.ts`
- [ ] 2.1.1.2 Define `AgentType` union type
- [ ] 2.1.1.3 Define `ModelPreferences` interface
- [ ] 2.1.1.4 Define `UserPreferences` interface
- [ ] 2.1.1.5 Export types

**Files**: `src/lib/types/model-preferences.ts` (new file)

**Validation**: TypeScript compilation succeeds

---

#### 2.1.2 Create Validation Functions
- [ ] 2.1.2.1 Define `MODEL_ID_REGEX` constant
- [ ] 2.1.2.2 Implement `isValidModelId()` function
- [ ] 2.1.2.3 Implement `sanitizeModelId()` function
- [ ] 2.1.2.4 Add `MODEL_ID_MAX_LENGTH` constant

**Files**: `src/lib/types/model-preferences.ts`

**Validation**: All validation test cases pass

---

## 3. Server Actions

### 3.1 Create Preferences Server Actions

#### 3.1.1 Create Preferences Action File
- [ ] 3.1.1.1 Create `src/actions/preferences.ts`
- [ ] 3.1.1.2 Add `'use server'` directive
- [ ] 3.1.1.3 Import required dependencies

**Files**: `src/actions/preferences.ts` (new file)

**Validation**: File is created with proper imports

---

#### 3.1.2 Implement Get Model Preferences
- [ ] 3.1.2.1 Create `getModelPreferences()` function
- [ ] 3.1.2.2 Get authenticated user from Supabase
- [ ] 3.1.2.3 Query `user_profiles` table
- [ ] 3.1.2.4 Extract `models` from preferences
- [ ] 3.1.2.5 Return `ModelPreferences` or null

**Files**: `src/actions/preferences.ts`

**Validation**: Returns user's model preferences

---

#### 3.1.3 Implement Save Model Preferences
- [ ] 3.1.3.1 Create `saveModelPreferences()` function
- [ ] 3.1.3.2 Validate all model IDs
- [ ] 3.1.3.3 Sanitize input (trim, lowercase)
- [ ] 3.1.3.4 Return error for invalid fields
- [ ] 3.1.3.5 Merge with existing preferences
- [ ] 3.1.3.6 Upsert to `user_profiles` table

**Files**: `src/actions/preferences.ts`

**Validation**: Saves valid preferences, rejects invalid

---

#### 3.1.4 Implement Validate Model ID
- [ ] 3.1.4.1 Create `validateModelId()` function
- [ ] 3.1.4.2 Check format with regex
- [ ] 3.1.4.3 Return validation result

**Files**: `src/actions/preferences.ts`

**Validation**: Correctly validates model IDs

---

## 4. LLM Service Enhancement

### 4.1 Add User Preference Support

#### 4.1.1 Add Helper Function
- [ ] 4.1.1.1 Import `AgentType` and `SupabaseClient` types
- [ ] 4.1.1.2 Create `getUserPreferredModel()` function
- [ ] 4.1.1.3 Query user profiles for model preference
- [ ] 4.1.1.4 Fallback to system default
- [ ] 4.1.1.5 Log model choice for debugging

**Files**: `src/lib/services/llm-service.ts`

**Validation**: Returns user's model or default

---

## 5. Agent Updates

### 5.1 Update CV Agent

#### 5.1.1 Modify Agent Initialization
- [ ] 5.1.1.1 Change `llm` to nullable in constructor
- [ ] 5.1.1.2 Create `initializeLLM()` method
- [ ] 5.1.1.3 Fetch user's preferred model
- [ ] 5.1.1.4 Initialize LLM with preferred model

**Files**: `src/lib/agents/cv-agent.ts`

**Validation**: CV agent uses user's model preference

---

#### 5.1.2 Update Workflow Methods
- [ ] 5.1.2.1 Add `userId` parameter to `analyzeCV()`
- [ ] 5.1.2.2 Call `initializeLLM()` before using LLM
- [ ] 5.1.2.3 Pass `agentType: 'cv_analysis'` to helper

**Files**: `src/lib/agents/cv-agent.ts`

**Validation**: CV analysis works with custom model

---

### 5.2 Update Interview Agent

#### 5.2.1 Modify Agent Initialization
- [ ] 5.2.1.1 Change `llm` to nullable in constructor
- [ ] 5.2.1.2 Create `initializeLLM()` method
- [ ] 5.2.1.3 Fetch user's preferred model
- [ ] 5.2.1.4 Initialize LLM with preferred model

**Files**: `src/lib/agents/interview-agent.ts`

**Validation**: Interview agent uses user's model preference

---

#### 5.2.2 Update Workflow Methods
- [ ] 5.2.2.1 Add `userId` parameter to workflow methods
- [ ] 5.2.2.2 Call `initializeLLM()` before using LLM
- [ ] 5.2.2.3 Pass `agentType: 'interview_preparation'` to helper

**Files**: `src/lib/agents/interview-agent.ts`

**Validation**: Interview prep works with custom model

---

### 5.3 Update Skill Gap Agent

#### 5.3.1 Modify Agent Initialization
- [ ] 5.3.1.1 Change `llm` to nullable in constructor
- [ ] 5.3.1.2 Create `initializeLLM()` method
- [ ] 5.3.1.3 Fetch user's preferred model
- [ ] 5.3.1.4 Initialize LLM with preferred model

**Files**: `src/lib/agents/skill-gap-agent.ts`

**Validation**: Skill gap agent uses user's model preference

---

#### 5.3.2 Update Workflow Methods
- [ ] 5.3.2.1 Add `userId` parameter to `analyzeSkillGap()`
- [ ] 5.3.2.2 Call `initializeLLM()` before using LLM
- [ ] 5.3.2.3 Pass `agentType: 'skill_gap_analysis'` to helper

**Files**: `src/lib/agents/skill-gap-agent.ts`

**Validation**: Skill gap works with custom model

---

### 5.4 Update Cover Letter Service

#### 5.4.1 Modify Service Methods
- [ ] 5.4.1.1 Add `userId` parameter to `generateCoverLetter()`
- [ ] 5.4.1.2 Fetch user's preferred model
- [ ] 5.4.1.3 Initialize LLM with preferred model
- [ ] 5.4.1.4 Pass `agentType: 'cover_letter_generation'` to helper

**Files**: `src/lib/services/cover-letter-service.ts`

**Validation**: Cover letter generation works with custom model

---

### 5.5 Update Server Actions

#### 5.5.1 Pass User ID to Agents
- [ ] 5.5.1.1 Update `src/actions/cv.ts` to pass userId
- [ ] 5.5.1.2 Update `src/actions/interview.ts` to pass userId
- [ ] 5.5.1.3 Update `src/actions/skill-gap.ts` to pass userId
- [ ] 5.5.1.4 Update `src/actions/cover-letter.ts` to pass userId

**Files**: `src/actions/*.ts`

**Validation**: All actions pass userId to agents

---

## 6. UI Components

### 6.1 Create Model Preferences Form

#### 6.1.1 Create Form Component
- [ ] 6.1.1.1 Create `src/components/profile/model-preferences-form.tsx`
- [ ] 6.1.1.2 Add `'use client'` directive
- [ ] 6.1.1.3 Define `AGENT_LABELS` constant
- [ ] 6.1.1.4 Create component props interface

**Files**: `src/components/profile/model-preferences-form.tsx` (new file)

**Validation**: Component compiles without errors

---

#### 6.1.2 Implement Form State
- [ ] 6.1.2.1 Initialize state with `initialPreferences`
- [ ] 6.1.2.2 Create `handleChange` function
- [ ] 6.1.2.3 Create `handleBlur` validation function
- [ ] 6.1.2.4 Create `handleSave` function
- [ ] 6.1.2.5 Create `handleReset` function

**Files**: `src/components/profile/model-preferences-form.tsx`

**Validation**: Form state updates correctly

---

#### 6.1.3 Build Form UI
- [ ] 6.1.3.1 Add Card with header and description
- [ ] 6.1.3.2 Add Input for each agent type
- [ ] 6.1.3.3 Add Label for each input
- [ ] 6.1.3.4 Add helper text with format examples
- [ ] 6.1.3.5 Add Save and Reset buttons
- [ ] 6.1.3.6 Add popular models reference

**Files**: `src/components/profile/model-preferences-form.tsx`

**Validation**: UI renders correctly

---

#### 6.1.4 Add Validation Feedback
- [ ] 6.1.4.1 Show error state for invalid model IDs
- [ ] 6.1.4.2 Display toast on save success
- [ ] 6.1.4.3 Display toast on save error
- [ ] 6.1.4.4 Display toast on validation error
- [ ] 6.1.4.5 Show loading state during save

**Files**: `src/components/profile/model-preferences-form.tsx`

**Validation**: Validation feedback works correctly

---

### 6.2 Update Profile Page

#### 6.2.1 Replace Coming Soon Placeholder
- [ ] 6.2.1.1 Remove "Coming soon" Card
- [ ] 6.2.1.2 Import `ModelPreferencesForm`
- [ ] 6.2.1.3 Import `getModelPreferences` action
- [ ] 6.2.1.4 Fetch model preferences server-side
- [ ] 6.2.1.5 Pass preferences to form

**Files**: `src/app/(dashboard)/profile/page.tsx`

**Validation**: Profile page shows model preferences form

---

## 7. Testing

### 7.1 Unit Tests

#### 7.1.1 Test Model Validation
- [ ] 7.1.1.1 Test valid model IDs are accepted
- [ ] 7.1.1.2 Test invalid model IDs are rejected
- [ ] 7.1.1.3 Test empty string handling
- [ ] 7.1.1.4 Test max length enforcement
- [ ] 7.1.1.5 Test sanitization (trim, lowercase)

**Files**: `src/__tests__/unit/model-preferences.test.ts` (new file)

**Validation**: All unit tests pass

---

### 7.2 Integration Tests

#### 7.2.1 Test Preferences Save/Load
- [ ] 7.2.1.1 Create user profile
- [ ] 7.2.1.2 Save model preferences
- [ ] 7.2.1.3 Load and verify preferences
- [ ] 7.2.1.4 Update preferences
- [ ] 7.2.1.5 Test RLS policies

**Files**: `src/__tests__/integration/preferences.test.ts` (new file)

**Validation**: Preferences persist correctly

---

### 7.3 E2E Tests

#### 7.3.1 Test Complete User Flow
- [ ] 7.3.1.1 User logs in
- [ ] 7.3.1.2 Navigate to profile page
- [ ] 7.3.1.3 Enter model preferences
- [ ] 7.3.1.4 Save preferences
- [ ] 7.3.1.5 Run CV analysis
- [ ] 7.3.1.6 Verify correct model used

**Files**: E2E test suite

**Validation**: Complete flow works end-to-end

---

## 8. Documentation

### 8.1 Update Documentation

#### 8.1.1 Update CLAUDE.md
- [ ] 8.1.1.1 Document model preferences feature
- [ ] 8.1.1.2 Update agent architecture section
- [ ] 8.1.1.3 Add troubleshooting section

**Files**: `CLAUDE.md`

**Validation**: Documentation is accurate

---

#### 8.1.2 Create User Guide
- [ ] 8.1.2.1 Explain how to set model preferences
- [ ] 8.1.2.2 Provide model ID examples
- [ ] 8.1.2.3 Link to OpenRouter models page

**Files**: `docs/user-guide/model-preferences.md` (new file)

**Validation**: User guide is clear and helpful

---

## 9. Validation

### 9.1 Pre-Merge Checklist
- [ ] 9.1.1 All TypeScript type checking passes
- [ ] 9.1.2 All ESLint checks pass
- [ ] 9.1.3 Test suite executes successfully
- [ ] 9.1.4 RLS policies enforced in all operations
- [ ] 9.1.5 Invalid model IDs fall back to default
- [ ] 9.1.6 Migration runs successfully

### 9.2 Deployment Validation
- [ ] 9.2.1 Deploy to staging environment
- [ ] 9.2.2 Run migration on staging database
- [ ] 9.2.3 Test model preference save/load
- [ ] 9.2.4 Test all agents with custom models
- [ ] 9.2.5 Verify fallback to default works

---

## Dependencies

**Can proceed in parallel**:
- Tasks 1 (database), 2 (types), and 3 (server actions)
- Tasks 4 (LLM service) and 5.1-5.4 (agents)
- Tasks 6 (UI) and 7 (testing)

**Must wait for**:
- Task 5.5 requires 5.1-5.4 (agents must be updated first)
- Task 6.2 requires 6.1 (form component must exist)
- Task 9 requires all previous tasks

**Critical Path**:
1 → 2 → 3 → 4 → 5 → 6 → 9
