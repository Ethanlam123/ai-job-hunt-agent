# Change: Add Job Description Integration to CV Analysis

## Why
Currently, CV analysis provides general improvement suggestions without job-specific context. Users need tailored recommendations that align their CV with specific job requirements, including keyword optimization and job-fit scoring.

## What Changes
- Add optional job description selection to CV analysis workflow
- Implement job-specific improvement suggestions alongside general improvements
- Add job-fit scoring (0-100) alongside existing CV quality score
- Create comparison view showing general vs job-specific insights
- Enhance DocumentSelector to include job descriptions from all features
- Integrate job context into existing approval workflow

## Impact
- **Affected specs**: cv-analysis (new capability)
- **Affected code**:
  - `src/lib/agents/cv-agent.ts` - Enhanced with job analysis
  - `src/components/cv/cv-analysis-client.tsx` - Job description selection UI
  - `src/actions/cv.ts` - Modified workflow
  - Database schema - Add job_description_id to sessions table
  - DocumentSelector component - Filter job descriptions from all sources