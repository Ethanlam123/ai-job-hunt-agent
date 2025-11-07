## Context
The CV analysis feature currently provides general improvement suggestions without specific job context. Users targeting specific positions need their CVs optimized for particular roles, with keyword matching and experience alignment tailored to job requirements.

## Goals / Non-Goals
- **Goals**:
  - Provide job-specific CV improvement suggestions
  - Add job-fit scoring alongside general CV scoring
  - Maintain backward compatibility (CV analysis works without JD)
  - Integrate seamlessly with existing approval workflow
- **Non-Goals**:
  - Automatic job applications
  - Real-time job board integration
  - Resume template generation

## Decisions
- **Decision**: Use comparison view for results (general vs job-specific)
  - **Reasoning**: Clear value differentiation and user choice
  - **Alternatives considered**: Integrated view, prioritized view
- **Decision**: Single approval workflow with smart grouping
  - **Reasoning**: Maintains consistency with existing UX
  - **Alternatives considered**: Dual approval flows, conditional approvals
- **Decision**: Job descriptions from all features as source
  - **Reasoning**: Maximizes reuse and user convenience
  - **Alternatives considered**: Dedicated JD library, skill-gap only

## Risks / Trade-offs
- **Analysis complexity** → Mitigation: Phased implementation, thorough testing
- **UI complexity** → Mitigation: Clear visual hierarchy, progressive disclosure
- **Performance impact** → Mitigation: Efficient LLM usage, caching strategies

## Migration Plan
1. Database schema update (add job_description_id)
2. Backend agent enhancements
3. Frontend component updates
4. Testing and validation
5. Documentation updates

## Open Questions
- Optimal weighting for job-fit score components
- Quality thresholds for job description validation
- Handling of very long or poorly formatted job descriptions