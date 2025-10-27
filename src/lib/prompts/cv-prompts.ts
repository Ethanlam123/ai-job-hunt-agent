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
}
