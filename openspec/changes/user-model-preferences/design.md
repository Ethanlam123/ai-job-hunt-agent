# Design: User-Selectable OpenRouter Model Preferences

## Context

The application currently uses a single system-wide default model for all AI operations. Users want the flexibility to choose different OpenRouter models for different features, enabling cost optimization and quality tuning.

### Stakeholders
- **Users**: Want control over AI model selection per feature
- **Development**: Need secure, validated input handling
- **Business**: Users can optimize their API costs by choosing appropriate models

### Constraints
- **Security**: Must validate model IDs to prevent injection attacks
- **Performance**: Minimize additional database queries
- **UX**: Simple text input, not a dropdown (models change frequently)
- **Backward Compatible**: System default must work for users without preferences

## Goals / Non-Goals

### Goals
- Allow users to specify custom OpenRouter model IDs per feature
- Validate model ID format before saving
- Fallback gracefully to system default for invalid/unset preferences
- Persist preferences in database with RLS protection

### Non-Goals
- Building a model marketplace/discovery interface
- Showing pricing information (user requested no pricing)
- Validating models against OpenRouter API (format validation only)
- Model performance benchmarking

## Decisions

### Decision 1: Free-Form Text Input vs Dropdown

**What**: Users type model IDs directly (e.g., `openai/gpt-4o-mini`) rather than selecting from a dropdown.

**Why**:
- OpenRouter adds new models frequently; dropdown would be outdated quickly
- Power users know exactly which model they want
- More flexible for testing new models
- Simpler to maintain (no model list to update)

**Alternatives Considered**:
1. **Dropdown with popular models** - Rejected: Models change too often
2. **Dropdown with custom option** - Rejected: Adds complexity, text input is simpler
3. **Autocomplete** - Rejected: Would require OpenRouter API integration

**Implementation**:
```tsx
<Input
  placeholder="e.g., openai/gpt-4o-mini"
  value={preferences.cv_analysis}
  onChange={(e) => handleChange('cv_analysis', e.target.value)}
/>
```

**Rationale**: Most flexible approach with lowest maintenance burden.

---

### Decision 2: Per-Feature vs Global Model Selection

**What**: Users choose a different model for each feature (CV Analysis, Interview Prep, etc.).

**Why**:
- Different features have different complexity requirements
- Users can optimize cost (use free model for simple tasks)
- Power users want fine-grained control

**Alternatives Considered**:
1. **Global setting only** - Rejected: User explicitly requested per-feature
2. **Per-feature with presets** - Rejected: Adds unnecessary complexity

**Implementation**:
```typescript
interface ModelPreferences {
  cv_analysis?: string
  interview_preparation?: string
  skill_gap_analysis?: string
  cover_letter_generation?: string
}
```

**Rationale**: Balances flexibility with simplicity. Empty value = use default.

---

### Decision 3: Model ID Validation Strategy

**What**: Validate format using regex, don't validate against OpenRouter API.

**Why**:
- API validation would add latency and complexity
- OpenRouter API key would be exposed to client
- Format validation catches obvious errors (injection attempts)
- Invalid formats fall back to default gracefully

**Alternatives Considered**:
1. **API validation** - Rejected: Performance cost, security risk
2. **No validation** - Rejected: Security risk from injection

**Implementation**:
```typescript
// Format: provider/model or provider/model:tag
// Examples: openai/gpt-4o-mini, google/gemini-2.0-flash-exp:free
export const MODEL_ID_REGEX = /^[a-z0-9_-]+\/[a-z0-9_.-]+(?::[a-z0-9_.-]+)?$/i

export function isValidModelId(modelId: string): boolean {
  if (!modelId || modelId.length > 200) return false
  return MODEL_ID_REGEX.test(modelId.trim())
}
```

**Rationale**: Catches malicious input while being fast and simple.

---

### Decision 4: Where to Store Preferences

**What**: Create new `user_profiles` table with `preferences` JSONB column.

**Why**:
- Supabase Auth's `users` table is read-only (managed by Supabase)
- JSONB allows flexible preference structure
- Can add more preferences later (theme, notifications, etc.)

**Alternatives Considered**:
1. **Add to existing `users` table** - Rejected: Table is managed by Supabase Auth
2. **Separate table per preference** - Rejected: Over-engineered
3. **User metadata in Auth** - Rejected: Limited size, harder to query

**Implementation**:
```sql
CREATE TABLE "user_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "preferences" jsonb DEFAULT '{"theme": "system", "models": {}}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now
);

-- RLS Policies
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON "user_profiles" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON "user_profiles" FOR UPDATE USING (auth.uid() = user_id);
```

**Rationale**: Follows Supabase best practices, allows future preference expansion.

---

### Decision 5: How Agents Fetch User Preferences

**What**: Each agent calls `getUserPreferredModel()` on initialization.

**Why**:
- One database query per agent invocation
- Cached in agent instance for duration of operation
- Fallback to default if fetch fails

**Alternatives Considered**:
1. **Pass preferences as parameters** - Rejected: Complicates agent interface
2. **Global context/provider** - Rejected: Server Components don't have global state
3. **Pre-fetch in server action** - Rejected: Duplicates logic across all actions

**Implementation**:
```typescript
// In llm-service.ts
export async function getUserPreferredModel(
  supabase: SupabaseClient,
  userId: string,
  agentType: AgentType
): Promise<string> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('user_id', userId)
    .single()

  return profile?.preferences?.models?.[agentType]
    || APP_CONSTANTS.LLM_MODELS.DEFAULT
}

// In agent constructor
constructor(supabase: SupabaseClient) {
  this.supabase = supabase
  this.llm = null // Initialized per-request with user's model
}

private async initializeLLM(userId: string, agentType: AgentType) {
  const model = await getUserPreferredModel(this.supabase, userId, agentType)
  this.llm = new ChatOpenAI({ model, ... })
}
```

**Rationale**: Clean separation of concerns, minimal performance impact.

---

### Decision 6: Empty Value Semantics

**What**: Empty string means "use system default", not "no model".

**Why**:
- Distinguishes between "no preference set" and "explicitly chose a model"
- Allows users to clear their preference and revert to default
- Simpler than null/undefined handling

**Alternatives Considered**:
1. **Null/undefined for default** - Rejected: JSONB doesn't preserve undefined
2. **Special "default" string** - Rejected: Confusing if there's a model named "default"

**Implementation**:
```typescript
// When saving
const sanitizedPreferences: ModelPreferences = {}
for (const [agentType, modelId] of Object.entries(preferences)) {
  if (modelId && modelId.trim()) {  // Only save non-empty values
    sanitizedPreferences[agentType] = sanitizeModelId(modelId)
  }
}

// When using
const userChoice = profile?.preferences?.models?.[agentType]
const modelToUse = (userChoice && userChoice.trim())
  ? userChoice
  : APP_CONSTANTS.LLM_MODELS.DEFAULT
```

**Rationale**: Intuitive UX - clear the field to reset to default.

## Risks / Trade-offs

### Risk 1: Invalid Model IDs Break Features

**Risk**: User enters invalid model ID, feature fails.

**Mitigation**:
- Format validation rejects obviously invalid IDs
- Graceful fallback to system default
- Log errors for debugging
- Show validation error on blur

### Risk 2: Performance Impact from Extra DB Query

**Risk**: Each agent invocation adds one database query.

**Mitigation**:
- Query is simple (indexed lookup by user_id)
- Latency: ~10-20ms per query
- Acceptable tradeoff for flexibility

### Risk 3: Users Don't Understand Model IDs

**Risk**: Users don't know what model IDs to enter.

**Mitigation**:
- Show helper text with format examples
- Link to OpenRouter models page
- List popular free models as examples
- Empty = use default (safe choice)

### Risk 4: Model Becomes Unavailable

**Risk**: User's chosen model is removed from OpenRouter.

**Mitigation**:
- Agent will fail gracefully
- User can update preference
- Fallback to default not automatic (user awareness of issue)

## Migration Plan

### Phase 1: Database (Day 1)
1. Create migration file for `user_profiles` table
2. Run migration in development
3. Test RLS policies

### Phase 2: Backend (Days 2-3)
1. Create model-preferences types
2. Add server actions
3. Update LLM service
4. Update all 4 agents

### Phase 3: Frontend (Days 3-4)
1. Create ModelPreferencesForm component
2. Update profile page
3. Add validation UI feedback

### Phase 4: Testing (Day 5)
1. Unit tests for validation
2. Integration tests for preferences save/load
3. E2E test for complete flow

### Rollback Plan
- Comment out `getUserPreferredModel()` calls in agents
- Remove preferences form from profile page
- Users revert to system default behavior

## Open Questions

### Q1: Should we validate models against OpenRouter API?
**Status**: No - format validation only

**Rationale**: API validation adds latency and complexity. Users will get an error from OpenRouter if they choose an invalid model, which is appropriate feedback.

### Q2: Should there be a "Reset to Defaults" button?
**Status**: Yes

**Rationale**: Users may want to clear all preferences at once.

### Q3: Should we show which model is currently in use?
**Status**: No - not in MVP

**Rationale**: Would require showing "default" vs "user's choice". Can add later if requested.

## Performance Considerations

### Database Query Impact
- **Query**: `SELECT preferences FROM user_profiles WHERE user_id = $1`
- **Index**: Primary key on `user_id` (automatic)
- **Latency**: ~10-20ms
- **Frequency**: Once per agent invocation

### Agent Initialization Impact
- **Before**: Agent initialized with default model
- **After**: Agent fetches preference, then initializes
- **Added latency**: ~10-20ms per agent
- **Acceptable**: Agent operations take 5-30s anyway

## Security Considerations

### Input Validation
- **Regex**: `^[a-z0-9_-]+\/[a-z0-9_.-]+(?::[a-z0-9_.-]+)?$`
- **Max length**: 200 characters
- **Sanitization**: Trim whitespace, convert to lowercase
- **Blocks**: Path traversal (`../`), SQL injection, special characters

### RLS Protection
- Policy: `auth.uid() = user_id`
- Users can only read/write their own preferences
- Database-level enforcement

### Error Handling
- Invalid model IDs don't crash the app
- Fallback to system default
- Errors logged for debugging
- User sees clear error messages
