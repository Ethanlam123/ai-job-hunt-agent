/**
 * CV Analysis Prompts for LLM interactions
 */

export class CVPrompts {
  /**
   * Analyze CV structure and completeness
   */
  static analyzeStructure(cvContent: any): string {
    return `You are an expert CV reviewer. Analyze the following CV content and evaluate its structure and completeness.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Provide a structured analysis in JSON format with the following fields:
{
  "overallScore": number (0-100),
  "sections": {
    "contactInfo": { "present": boolean, "quality": "excellent" | "good" | "poor" | "missing", "issues": string[] },
    "summary": { "present": boolean, "quality": "excellent" | "good" | "poor" | "missing", "issues": string[] },
    "experience": { "present": boolean, "quality": "excellent" | "good" | "poor" | "missing", "issues": string[] },
    "education": { "present": boolean, "quality": "excellent" | "good" | "poor" | "missing", "issues": string[] },
    "skills": { "present": boolean, "quality": "excellent" | "good" | "poor" | "missing", "issues": string[] }
  },
  "strengths": string[],
  "weaknesses": string[],
  "recommendations": string[]
}

Focus on:
- Completeness of essential sections
- Clarity and organization
- Professional formatting
- Quantifiable achievements
- Action verbs and impact statements

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Identify specific improvements for CV
   */
  static identifyImprovements(cvContent: any, analysis: any): string {
    return `Based on the CV content and analysis, identify specific improvements that can be made.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Analysis:
${JSON.stringify(analysis, null, 2)}

Generate a list of actionable improvements in JSON format:
{
  "improvements": [
    {
      "id": "unique-id",
      "type": "add" | "edit" | "remove" | "reorder",
      "section": "experience" | "education" | "skills" | "summary" | "other",
      "priority": "critical" | "high" | "medium" | "low",
      "title": "Brief description",
      "description": "Detailed explanation of the improvement",
      "originalContent": "Original text (if applicable)",
      "suggestedContent": "Suggested replacement or addition",
      "reasoning": "Why this improvement matters"
    }
  ]
}

Guidelines:
- Prioritize improvements that add quantifiable achievements
- Suggest stronger action verbs
- Recommend adding missing critical information
- Identify redundant or weak content to remove
- Ensure professional tone and formatting

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Generate detailed suggestions for specific section
   */
  static generateSectionSuggestions(section: string, content: string): string {
    return `You are a professional CV writer. Review the following ${section} section and provide detailed improvement suggestions.

Current Content:
${content}

Provide suggestions in JSON format:
{
  "suggestions": [
    {
      "issue": "Description of the issue",
      "suggestion": "How to improve it",
      "example": "Example of improved text",
      "impact": "high" | "medium" | "low"
    }
  ],
  "rewrittenVersion": "Complete rewritten version of the section (if major changes needed)"
}

Focus on:
- Strong action verbs
- Quantifiable achievements
- Impact and results
- Clarity and conciseness
- ATS-friendly keywords
- Professional tone

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Compare CV against job description
   */
  static compareWithJobDescription(cvContent: any, jdContent: any): string {
    return `You are a recruitment expert. Compare the CV against the job description and identify gaps and matches.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Job Description:
${JSON.stringify(jdContent, null, 2)}

Provide analysis in JSON format:
{
  "matchScore": number (0-100),
  "keywordMatches": {
    "matched": string[],
    "missing": string[]
  },
  "skillsAnalysis": {
    "requiredSkillsPresent": string[],
    "requiredSkillsMissing": string[],
    "additionalSkillsPresent": string[]
  },
  "experienceAlignment": {
    "score": number (0-100),
    "gaps": string[],
    "strengths": string[]
  },
  "recommendations": [
    {
      "priority": "critical" | "high" | "medium" | "low",
      "suggestion": string,
      "section": string
    }
  ]
}

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Generate ATS-friendly keywords
   */
  static generateATSKeywords(cvContent: any): string {
    return `Analyze the CV and suggest ATS (Applicant Tracking System) friendly keywords that should be included.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Provide keywords in JSON format:
{
  "currentKeywords": string[],
  "suggestedKeywords": {
    "technical": string[],
    "soft": string[],
    "industrySpecific": string[],
    "certifications": string[]
  },
  "placementSuggestions": {
    "summary": string[],
    "skills": string[],
    "experience": string[]
  }
}

Focus on:
- Industry-standard terminology
- Technical skills and tools
- Certifications and qualifications
- Action verbs commonly searched by ATS
- Job-specific keywords

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Evaluate CV readability and tone
   */
  static evaluateReadability(cvContent: any): string {
    return `Evaluate the readability, tone, and overall presentation of this CV.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Provide evaluation in JSON format:
{
  "readabilityScore": number (0-100),
  "toneAnalysis": {
    "overall": "professional" | "casual" | "mixed",
    "consistency": "consistent" | "inconsistent",
    "issues": string[]
  },
  "lengthAnalysis": {
    "pageCount": number,
    "wordCount": number,
    "recommendation": "too short" | "optimal" | "too long",
    "suggestion": string
  },
  "formattingIssues": string[],
  "improvementAreas": [
    {
      "area": string,
      "issue": string,
      "suggestion": string
    }
  ]
}

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Generate dynamic, contextual questions for CV information collection
   */
  static generateContextualQuestions(
    cvContent: any,
    cvAnalysis: any,
    approvedImprovements: any[],
    jobDescription?: any,
    userProfile?: {
      currentLevel?: string;
      targetRole?: string;
      industry?: string;
      yearsExperience?: string;
    }
  ): string {
    return `You are an expert CV strategist and career coach with deep expertise in helping professionals create compelling CVs that get results. Your task is to generate personalized, contextual questions that will help extract the specific information needed to enhance this user's CV based on their unique situation.

## CONTEXT ANALYSIS

### Current CV Content:
${cvContent ? JSON.stringify(cvContent, null, 2) : 'No CV content available'}

### CV Analysis Results:
${cvAnalysis ? JSON.stringify(cvAnalysis, null, 2) : 'No analysis available'}

### Approved Improvements:
${approvedImprovements ? JSON.stringify(approvedImprovements, null, 2) : 'No approved improvements'}

### Job Description Context:
${jobDescription ? JSON.stringify(jobDescription, null, 2) : 'No job description provided'}

### User Profile:
- Current Career Level: ${userProfile?.currentLevel || 'Not specified'}
- Target Role: ${userProfile?.targetRole || 'Not specified'}
- Industry Focus: ${userProfile?.industry || 'Not specified'}
- Years of Experience: ${userProfile?.yearsExperience || 'Not specified'}

## QUESTION GENERATION STRATEGY

Generate 8-12 targeted questions that follow this priority order:

### HIGH PRIORITY (Must Include)
1. **Achievement Quantification Questions** - For each approved improvement related to experience or skills
2. **Gap-Filling Questions** - Addressing specific weaknesses identified in analysis
3. **Job-Specific Questions** - If job description is provided, focus on alignment

### MEDIUM PRIORITY
4. **Deep-Dive Experience Questions** - Extract detailed impact stories
5. **Skills Emphasis Questions** - Technical and soft skills relevant to target role
6. **Value Proposition Questions** - Unique selling points and differentiators

### LOWER PRIORITY
7. **Career Narrative Questions** - Storytelling and progression
8. **Formatting Preferences** - Presentation and structure preferences

## QUESTION DESIGN PRINCIPLES

### 1. CONTEXTUAL AWARENESS
- Reference specific content from their CV when asking questions
- Acknowledge approved improvements and build upon them
- Connect questions to their career level and target role
- Use industry-specific terminology relevant to their field

### 2. METRIC-ORIENTED
Always frame questions to encourage quantifiable answers:
- Instead of "What did you accomplish?" → "What measurable impact did your work have on business outcomes?"
- Instead of "Did you improve anything?" → "By what percentage did you improve efficiency/revenue/user engagement?"
- Include prompts for specific numbers, percentages, timeframes, and scope

### 3. IMPACT-FOCUSED
Structure questions to extract:
- **Situation**: Context and challenge
- **Action**: Specific steps taken
- **Result**: Measurable outcomes and impact
- **Scale**: Scope (team size, budget, geographic reach)
- **Duration**: Timeline and sustainability

### 4. PERSONALIZATION INDICATORS
For each question, include:
- [CV REFERENCE]: Direct reference to their CV content
- [IMPROVEMENT]: Connection to approved improvement
- [LEVEL]: Tailored to their experience level
- [GOAL]: Alignment with their career objectives

## OUTPUT FORMAT

Generate questions in this JSON structure:

{
  "questions": [
    {
      "id": "unique-question-id",
      "category": "achievements" | "skills" | "experience" | "career" | "formatting",
      "priority": "high" | "medium" | "low",
      "type": "textarea" | "text" | "select" | "multiselect",
      "question": "The actual question text",
      "context": {
        "cvReference": "Reference to specific CV content",
        "improvementLink": "Connection to approved improvement",
        "whyThisMatters": "Explanation of why this information is important"
      },
      "guidance": {
        "whatToInclude": "Specific elements they should include in their answer",
        "exampleAnswer": "Example of a good answer structure",
        "avoidThis": "Common mistakes to avoid"
      },
      "required": true | false,
      "followUpQuestions": ["Potential follow-up question 1", "Potential follow-up question 2"]
    }
  ],
  "questionStrategy": {
    "totalQuestions": number,
    "highPriorityCount": number,
    "focusAreas": ["area1", "area2", "area3"],
    "personalizationScore": number (0-100),
    "estimatedTime": "X-Y minutes to complete"
  }
}

## EXECUTION INSTRUCTIONS

1. **Analyze the context thoroughly** before generating questions
2. **Prioritize questions** that will have the biggest impact on CV quality
3. **Make every question personal** and specific to their situation
4. **Include guidance** that helps them provide better answers
5. **Avoid generic questions** that could apply to anyone
6. **Ensure variety** across different aspects of their CV
7. **Consider their experience level** - senior professionals get different questions than entry-level
8. **Connect to their goals** - every question should serve their career objectives

Generate the questions now, ensuring each one is personalized, impactful, and designed to extract the specific information needed to create an outstanding CV.

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Generate follow-up questions for extracting detailed achievements and metrics
   */
  static generateAchievementDetailQuestions(
    initialResponse: string,
    questionContext: any
  ): string {
    return `You are helping a user provide more detailed, quantifiable achievements for their CV. Based on their initial response, generate specific follow-up questions to extract metrics and impact.

### Initial Response:
${initialResponse}

### Question Context:
${JSON.stringify(questionContext, null, 2)}

## FOLLOW-UP QUESTION GENERATION STRATEGY

Analyze the initial response and identify opportunities to extract:
1. **Specific Metrics**: Numbers, percentages, timeframes, scope
2. **Business Impact**: Revenue, cost savings, efficiency gains
3. **Scale and Reach**: Team size, user base, geographic scope
4. **Innovation and Improvement**: Before/after comparisons
5. **Recognition and Awards**: External validation of achievements

## OUTPUT FORMAT

Generate 2-4 follow-up questions in this JSON format:

{
  "followUpQuestions": [
    {
      "id": "followup-question-id",
      "question": "Specific follow-up question",
      "focus": "metrics" | "impact" | "scale" | "innovation" | "recognition",
      "examples": ["Example of what to include"],
      "required": true | false
    }
  ],
  "analysis": {
    "currentDetailLevel": "low" | "medium" | "high",
    "missingElements": ["metrics", "impact", "scale"],
    "improvementSuggestions": ["Be more specific about X", "Include numbers for Y"]
  }
}

Focus on extracting quantifiable, impressive details that will make their CV stand out to recruiters.

Return ONLY valid JSON, no markdown or additional text.`
  }
}
