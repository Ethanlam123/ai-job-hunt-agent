# Change: User-Selectable OpenRouter Model Preferences

## Why

Users want control over which AI models are used for different features. Current implementation uses a single system-wide default model (`openai/gpt-oss-120b`) for all AI operations. This prevents users from:

1. **Optimizing costs** - Using free models like `nvidia/nemotron-3-nano-30b-a3b:free` for less critical tasks
2. **Choosing quality levels** - Using premium models like `openai/gpt-4o` for complex analysis
3. **Testing new models** - Trying latest models like `openai/gpt-5.2-chat` as they become available

## What Changes

### New Features
- Per-feature model selection (CV Analysis, Interview Preparation, Skill Gap Analysis, Cover Letter Generation)
- Free-form text input for any OpenRouter model ID
- Model ID validation (format: `provider/model` or `provider/model:tag`)
- Graceful fallback to system default for invalid/unset preferences

### Database Schema Changes
- Create `user_profiles` table with `preferences` JSONB column
- Add RLS policies for user-scoped access
- Store model preferences: `preferences.models.{agent_type}`

### Service Layer Changes
- Add `getUserPreferredModel()` helper to LLM service
- Update all 4 agents to fetch and use user's preferred model
- Add server actions for saving/loading model preferences

### API Changes
- `saveModelPreferences(preferences)` - Save user's model choices
- `getModelPreferences()` - Get user's current model preferences
- `validateModelId(modelId)` - Validate model ID format

### UI Changes
- Replace "Coming soon" placeholder with Model Preferences form
- Add text input for each agent type (CV Analysis, Interview Prep, etc.)
- Show model ID format helper text and examples

## Impact

### Affected Specs
- **user-profile** - New capability for model preferences

### Affected Code
- `src/app/(dashboard)/profile/page.tsx` - Add model preferences form
- `src/lib/repositories/user.repository.ts` - Ensure supports model preferences
- `src/lib/services/llm-service.ts` - Add getUserPreferredModel helper
- `src/lib/agents/cv-agent.ts` - Use user's preferred model
- `src/lib/agents/interview-agent.ts` - Use user's preferred model
- `src/lib/agents/skill-gap-agent.ts` - Use user's preferred model
- `src/lib/services/cover-letter-service.ts` - Use user's preferred model
- `src/actions/preferences.ts` (NEW) - Server actions for preferences

### Breaking Changes
None - All changes are additive. System default is used if preferences not set.

### Migration Requirements
- Run migration to create `user_profiles` table
- Existing users get system default behavior until they set preferences

### Risk Assessment
- **Security Risk**: LOW - Strict validation prevents injection attacks
- **Performance Risk**: LOW - One additional DB query per agent invocation
- **Data Quality Risk**: LOW - Invalid model IDs fall back to default gracefully
- **Rollback Plan**: Remove preferences check in agents, users revert to system default
