## Context

The CV analysis workflow currently follows: upload → analyzing → results → approvals → summary → CV generation. Users can approve/reject improvements but don't provide additional context that would help generate a better CV. This leads to generic CV outputs that may not align with users' specific career goals, target roles, or industry preferences.

## Goals / Non-Goals

**Goals:**
- Collect targeted information from users to enhance CV generation
- Provide dynamic questions based on CV analysis results and approved improvements
- Maintain the existing approval workflow while adding context collection
- Ensure the information collection step feels natural and not burdensome
- Generate more personalized and effective CVs based on collected information

**Non-Goals:**
- Replace the existing approval workflow
- Create mandatory lengthy questionnaires
- Change the fundamental CV generation process
- Implement complex branching logic for question generation

## Decisions

**Decision: Dynamic Question Generation**
- Questions are generated based on CV analysis gaps and approved improvements
- Essential questions (contact info, career goals) are always shown
- Optional questions (specific achievements, preferences) are conditionally shown
- Questions are categorized and presented logically

**Decision: Step Integration**
- Information collection is inserted between approvals and CV generation
- Users can navigate back to review approvals if needed
- Progress indicator shows this as part of the complete workflow
- Skip functionality available for non-essential questions

**Decision: Data Storage**
- User responses stored in `user_responses` table linked to session
- Responses are structured JSON for flexibility
- Privacy-respecting: only necessary information collected
- Data available for future CV updates and iterations

## Risks / Trade-offs

- **Risk**: Users may abandon the process if questions feel burdensome
  - **Mitigation**: Limit to essential questions, provide skip options, show progress

- **Risk**: Question generation may not be relevant to all users
  - **Mitigation**: Use analysis results to personalize questions, provide "not applicable" option

- **Trade-off**: Additional step increases workflow length
  - **Justification**: Improved CV quality justifies minimal additional time investment

## Migration Plan

1. **Database Schema Update**
   - Add `user_responses` table with session linkage
   - Update session state to include information collection stage

2. **Component Integration**
   - Add information collection state to CVAnalysisClient
   - Create question/response UI components
   - Update navigation flow and progress indicators

3. **Backend Updates**
   - Extend CV agent to generate contextual questions
   - Add server actions for saving responses
   - Update CV generation service to use collected information

4. **Testing**
   - Test question generation accuracy
   - Verify response storage and retrieval
   - Validate improved CV generation quality

## Open Questions

- How many questions should be shown at maximum to avoid user fatigue?
- Should questions be presented all at once or in smaller groups?
- How should we handle cases where users provide minimal information?
- Should collected information persist for future CV updates in the same session?