# Change: Add CV Information Collection Step

## Why
The current CV analysis workflow jumps directly from approval/rejection to generating the updated CV without collecting specific information needed for optimal CV generation. Users should be asked targeted questions about their career goals, preferred industries, experience level, and other relevant details to ensure the generated CV is tailored to their specific needs and objectives.

## What Changes
- Add a new workflow step "information_collection" between "approvals" and "summary"
- Create dynamic question generation based on CV analysis results and approved improvements
- Implement question categories: personal details, career objectives, experience preferences, industry focus, and CV formatting preferences
- Store user responses in database for CV generation service
- Create progress indicator showing information collection as part of the workflow
- Add skip/optional functionality for non-essential questions
- Integrate collected information with existing CV generation service

## Impact
- **Affected specs**: cv-analysis (modified workflow)
- **Affected code**:
  - `src/components/cv/cv-analysis-client.tsx` - Add information collection UI
  - `src/actions/cv.ts` - Add server actions for question handling
  - `src/lib/agents/cv-agent.ts` - Enhanced to generate questions
  - Database schema - Add user_responses table to store question answers
  - `src/lib/services/cv-generation-service.ts` - Use collected info for generation