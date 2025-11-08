# Change: Add CV Information Collection Step

## Why
The current CV analysis workflow jumps directly from approval/rejection to generating the updated CV without collecting specific information needed for optimal CV generation. The system should ask dynamic, LLM-generated questions based on the actual CV content and approved improvements to encourage users to provide more detailed information that will enhance the quality of the generated CV.

## What Changes
- Add a new workflow step "information_collection" between "approvals" and "summary"
- Create completely dynamic LLM-generated questions that analyze CV content and approved improvements
- Eliminate fixed question templates - all questions will be contextual and generated based on:
  - Gaps identified in the current CV
  - Approved improvement areas
  - Missing details that would strengthen the CV
  - User's experience level and career trajectory
- Store user responses in database for CV generation service
- Create progress indicator showing information collection as part of the workflow
- Add skip/optional functionality for non-essential questions
- Integrate collected information with existing CV generation service

## Impact
- **Affected specs**: cv-analysis (modified workflow)
- **Affected code**:
  - `src/components/cv/cv-analysis-client.tsx` - Add information collection UI
  - `src/actions/cv.ts` - Add server actions for question handling
  - `src/lib/agents/cv-agent.ts` - Enhanced to generate contextual LLM questions based on CV analysis
  - Database schema - Add user_responses table to store question answers
  - `src/lib/services/cv-generation-service.ts` - Use collected info for generation
  - `src/lib/prompts/cv-prompts.ts` - Add prompts for generating contextual questions