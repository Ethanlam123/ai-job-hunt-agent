# Job-Enhanced CV Analysis Feature Design

## Overview
Extend the existing CV Analysis feature to optionally include a job description, providing tailored improvements and a job-fit score alongside general CV improvements. This enhances the CV analysis to be more contextually relevant when users are targeting specific positions.

## Current State Analysis
The CV analysis feature currently works as a standalone improvement system:
- Parses CV content using DocumentService
- Analyzes structure using LLM with general CV best practices
- Identifies improvements without specific job context
- Uses a 4-step sequential workflow (parse → analyze → identify improvements → save)
- Requires user approval for all suggested changes

## Proposed Architecture

### 1. Enhanced CV Analysis Workflow

#### Modified Workflow Steps:
1. **Parse Documents** - Parse both CV and job description (if provided)
2. **Analyze Structure** - Analyze CV structure and job requirements separately
3. **Generate Improvements** - Create both general and job-specific improvements
4. **Calculate Scores** - Generate both general CV score and job-fit score
5. **Save Results** - Store all results with job association

#### New Data Flow:
```
User Input (CV + optional JD)
    ↓
Document Parser (CV + JD content)
    ↓
Parallel Analysis:
├── General CV Analysis
└── Job Requirement Analysis
    ↓
Improvement Generation:
├── General Improvements
└── Job-Specific Tailoring
    ↓
Score Calculation:
├── Overall CV Score (/100)
└── Job-Fit Score (/100)
    ↓
Approval Workflow (integrated)
```

### 2. Enhanced CVAgent

#### Modified CVState Interface:
```typescript
interface CVState {
  userId: string
  sessionId: string
  documentId: string
  jobDescriptionId?: string  // New: optional JD reference
  cvContent: any
  jobDescriptionContent?: any  // New: parsed JD content
  analysis: {
    general: any  // General CV analysis
    jobSpecific?: any  // Job-specific analysis
  }
  improvements: {
    general: any[]
    jobSpecific: any[]
  }
  scores: {
    overall: number  // Existing general score
    jobFit?: number  // New job-fit score
  }
  approvalStatus: 'pending' | 'approved' | 'rejected'
  error?: string
}
```

#### New Agent Methods:
- `parseJobDescriptionNode()` - Parse job description content
- `analyzeJobRequirementsNode()` - Extract job requirements using LLM
- `generateJobSpecificImprovementsNode()` - Create job-tailored improvements
- `calculateJobFitScoreNode()` - Calculate job-fit score
- `saveResultsWithJobContext()` - Save results with job association

### 3. Enhanced User Interface

#### Modified CVAnalysisClient Component:

**Upload Step Enhancements:**
- Add third tab: "Add Job Description (Optional)"
- DocumentSelector filtered for job descriptions from all features
- Clear "Skip for now" option
- Visual hierarchy showing CV is required, JD is optional

**Results Step - Comparison View:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 CV Analysis Complete                                      │
├─────────────────────────────────────────────────────────────┤
│ General CV Score:     85/100    Job-Fit Score:    92/100    │
│ ┌─────────────┐           ┌─────────────┐                    │
│ │   Circle    │           │   Circle    │                    │
│ │  Progress   │           │  Progress   │                    │
│ └─────────────┘           └─────────────┘                    │
├─────────────────────────────────────────────────────────────┤
│ 📈 General Improvements (8)    🎯 Job-Specific (12)        │
├─────────────────────────────────────────────────────────────┤
│ [Tab 1: General]  [Tab 2: Job-Specific]  [Tab 3: Combined] │
└─────────────────────────────────────────────────────────────┘
```

**Three-Tab Results View:**
1. **General Improvements Tab** - Standard CV improvements (formatting, structure, general content)
2. **Job-Specific Tab** - Tailored improvements (keywords, experience highlighting, skill alignment)
3. **Combined Tab** - All improvements with priority badges (High for job-specific, Medium/Low for general)

### 4. Document Management Integration

#### Job Description Sources:
Enhance DocumentSelector to filter documents from:
- Skill gap analysis job descriptions (`document_type: 'job_description'`)
- Cover letter generation job descriptions
- Interview preparation job descriptions
- Any future feature with job descriptions

#### New Document Query:
```typescript
// Enhanced document selector query
const { data: jobDescriptions } = await supabase
  .from('documents')
  .select('*')
  .eq('user_id', userId)
  .in('document_type', ['job_description', 'cover_letter_jd', 'interview_jd'])
  .order('created_at', { ascending: false })
```

### 5. Enhanced LLM Prompts

#### Job-Specific Analysis Prompts:
```typescript
// New prompts for job-enhanced analysis
const JOB_ENHANCED_PROMPTS = {
  analyzeJobRequirements: (jobContent: string) => `
    Analyze this job description and extract:
    1. Required skills (technical and soft)
    2. Experience level and years required
    3. Key responsibilities
    4. Company culture indicators
    5. Must-have vs nice-to-have qualifications

    Job Description: ${jobContent}
  `,

  generateJobSpecificImprovements: (cvContent: string, jobRequirements: any) => `
    Compare this CV against the job requirements and suggest specific improvements:
    1. Missing keywords to add
    2. Experience to rehighlight
    3. Skills to emphasize
    4. Achievements that align with job responsibilities

    CV: ${cvContent}
    Job Requirements: ${JSON.stringify(jobRequirements)}
  `,

  calculateJobFitScore: (cvContent: string, jobRequirements: any) => `
    Calculate a job-fit score (0-100) based on:
    - Keyword matching: 40%
    - Experience alignment: 30%
    - Skills coverage: 20%
    - Overall compatibility: 10%

    Provide detailed scoring breakdown.
  `
}
```

### 6. Database Schema Changes

#### Enhanced Sessions Table:
```sql
-- Add job description reference to sessions
ALTER TABLE sessions
ADD COLUMN job_description_id UUID REFERENCES documents(id),
ADD COLUMN analysis_type VARCHAR(20) DEFAULT 'general' CHECK (analysis_type IN ('general', 'job_enhanced'));
```

#### Enhanced Analysis Storage:
```typescript
// Store both general and job-specific analysis
interface AnalysisResults {
  general: {
    overallScore: number
    sections: Record<string, any>
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  }
  jobSpecific?: {
    jobFitScore: number
    keywordMatch: number
    experienceAlignment: number
    skillsCoverage: number
    missingKeywords: string[]
    highlightedExperience: string[]
  }
}
```

### 7. Approval Workflow Integration

#### Single Approval Flow with Smart Grouping:
- All improvements go through the same approval process
- Improvements are tagged with type: 'general' | 'job_specific'
- Job-specific improvements are shown first (higher priority)
- Related improvements are grouped together (e.g., general section fix + job-specific keyword addition)

#### Enhanced Approval Interface:
```typescript
interface ApprovalItem {
  id: string
  type: 'general' | 'job_specific'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  reasoning: string
  jobContext?: string  // Why this change matters for the job
  section: string
}
```

### 8. Implementation Plan

#### Phase 1: Backend Infrastructure
1. Enhance CVAgent with job description parsing
2. Create job-specific analysis methods
3. Implement job-fit score calculation
4. Update database schema
5. Enhance LLM prompts

#### Phase 2: Frontend Integration
1. Add job description selection to CVAnalysisClient
2. Implement comparison view for scores
3. Create three-tab results interface
4. Enhance DocumentSelector for job descriptions
5. Add job context to approval items

#### Phase 3: Testing & Refinement
1. Test with various CV + JD combinations
2. Validate job-fit scoring algorithm
3. UI/UX testing with users
4. Performance optimization
5. Documentation updates

### 9. Success Metrics

#### User Engagement:
- Increase in CV analysis completion rate when JD is provided
- Higher approval rate for job-specific improvements
- User satisfaction scores for job-tailored suggestions

#### Technical Metrics:
- Analysis accuracy (validated against user feedback)
- Job-fit score correlation with actual job application success
- System performance with additional analysis steps

### 10. Edge Cases & Error Handling

#### Error Scenarios:
1. **Job description upload fails** - Graceful fallback to general analysis
2. **Job description parsing fails** - Show error, allow retry or skip
3. **Job-fit score calculation fails** - Show general analysis only
4. **User skips job description** - Proceed with general analysis workflow

#### Validation Rules:
- Job description must be text-based (PDF, TXT, DOCX)
- Maximum job description size: 5MB
- Job description quality check (minimum content requirements)
- Duplicate job description detection

## Conclusion

This design seamlessly integrates job description context into the existing CV analysis workflow while maintaining the current functionality. The comparison view provides clear value differentiation, and the integrated approval workflow keeps the user experience consistent. The phased implementation approach ensures we can deliver value incrementally while maintaining system stability.