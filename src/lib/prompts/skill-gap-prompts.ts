/**
 * Skill Gap Analysis Prompts for LLM interactions
 */

export class SkillGapPrompts {
  /**
   * Extract skills from CV content
   */
  static extractSkillsFromCV(cvContent: any): string {
    return `You are an expert career counselor and technical recruiter. Extract all skills from the following CV content and categorize them.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Provide a structured analysis in JSON format with the following fields:
{
  "technicalSkills": [
    {
      "name": "string",
      "proficiency": "beginner" | "intermediate" | "advanced" | "expert",
      "experience": "string (years/months of experience)",
      "evidence": "string (how this skill was demonstrated in CV)"
    }
  ],
  "softSkills": [
    {
      "name": "string",
      "proficiency": "beginner" | "intermediate" | "advanced" | "expert",
      "evidence": "string (how this skill was demonstrated in CV)"
    }
  ],
  "domainKnowledge": [
    {
      "name": "string",
      "proficiency": "beginner" | "intermediate" | "advanced" | "expert",
      "evidence": "string (how this knowledge was demonstrated)"
    }
  ]
}

Focus on:
- Technical skills (programming languages, tools, technologies)
- Soft skills (communication, leadership, teamwork, problem-solving)
- Domain knowledge (industry-specific knowledge, methodologies)
- Be thorough but only include skills with clear evidence from the CV
- Assign realistic proficiency levels based on experience level shown`
  }

  /**
   * Extract requirements from job description
   */
  static extractRequirementsFromJD(jobDescription: string): string {
    return `You are an expert job analyst. Extract all skill requirements from the following job description and categorize them by importance.

Job Description:
${jobDescription}

Provide a structured analysis in JSON format with the following fields:
{
  "requiredSkills": [
    {
      "name": "string",
      "category": "technical" | "soft" | "domain",
      "importance": "critical" | "important" | "nice-to-have",
      "description": "string (what the skill is used for)",
      "experienceLevel": "string (years/months required if mentioned)"
    }
  ],
  "responsibilities": [
    {
      "title": "string",
      "skillsUsed": ["string"],
      "importance": "critical" | "important" | "nice-to-have"
    }
  ],
  "qualificationSummary": {
    "minExperience": "string",
    "educationLevel": "string",
    "mustHaveSkills": ["string"],
    "preferredSkills": ["string"]
  }
}

Focus on:
- Clearly distinguish between must-have and preferred skills
- Identify both technical and soft skill requirements
- Note specific experience levels or certifications required
- Extract key responsibilities and the skills needed for each
- Be realistic about what's truly required vs nice-to-have`
  }

  /**
   * Analyze skill gaps and generate recommendations
   */
  static analyzeSkillGaps(cvSkills: any, jobRequirements: any): string {
    return `You are an expert career advisor and skills analyst. Compare the candidate's CV skills with the job requirements and provide a comprehensive skill gap analysis.

Candidate Skills:
${JSON.stringify(cvSkills, null, 2)}

Job Requirements:
${JSON.stringify(jobRequirements, null, 2)}

Provide a detailed skill gap analysis in JSON format with the following fields:
{
  "overallMatch": {
    "score": number (0-100),
    "summary": "string",
    "strengths": ["string"],
    "criticalGaps": ["string"]
  },
  "skillGaps": [
    {
      "skillName": "string",
      "category": "technical" | "soft" | "domain",
      "importance": "critical" | "important" | "nice-to-have",
      "currentLevel": "none" | "beginner" | "intermediate" | "advanced" | "expert",
      "requiredLevel": "beginner" | "intermediate" | "advanced" | "expert",
      "gapDescription": "string",
      "timeline": "short" | "medium" | "long",
      "learningAdvice": "string (general advice for acquiring this skill)",
      "reasoning": "string (why this timeline and advice)"
    }
  ],
  "strengthsToHighlight": [
    {
      "skillName": "string",
      "category": "technical" | "soft" | "domain",
      "proficiency": "string",
      "relevanceToJob": "string",
      "howToHighlight": "string"
    }
  ],
  "generalAdvice": {
    "overallStrategy": "string",
    "quickWins": ["string"],
    "longTermGoals": ["string"],
    "nextSteps": ["string"]
  }
}

Timeline definitions:
- "short": 0-3 months (can be learned quickly with focused effort)
- "medium": 3-6 months (requires consistent practice and possibly a course)
- "long": 6+ months (significant learning project, practice, or formal education)

Focus on:
- Be realistic about learning timelines
- Provide actionable, practical advice
- Consider transferable skills from related areas
- Prioritize critical gaps that must be addressed
- Suggest quick wins that can build momentum
- Include advice on highlighting existing strengths
- If job description lacks clear requirements, state this and provide general industry advice`
  }

  /**
   * Generate fallback analysis when information is insufficient
   */
  static generateFallbackAnalysis(cvContent: any, jobDescription: string): string {
    return `You are an expert career advisor. The job description provided doesn't contain clear skill requirements. Based on the candidate's CV and general industry standards, provide helpful career guidance.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Job Description (limited information):
${jobDescription}

Provide a general skill development analysis in JSON format with the following fields:
{
  "assessment": {
    "infoQuality": "limited" | "insufficient" | "adequate",
    "reason": "string (why information is limited)",
    "approach": "string (how you're providing guidance despite limitations)"
  },
  "currentSkills": {
    "technical": ["string"],
    "soft": ["string"],
    "domain": ["string"],
    "overallLevel": "string"
  },
  "suggestedDirections": [
    {
      "direction": "string",
      "skillsNeeded": ["string"],
      "timeline": "short" | "medium" | "long",
      "reasoning": "string"
    }
  ],
  "generalAdvice": {
    "improvementAreas": ["string"],
    "learningStrategy": "string",
    "nextSteps": ["string"]
  }
}

Focus on:
- Acknowledge the information limitations clearly
- Provide helpful general career guidance based on their current profile
- Suggest logical career progression paths
- Recommend skill development that would be valuable in most roles
- Encourage gathering more specific job requirements for better analysis`
  }

  /**
   * Validate job description quality
   */
  static validateJobDescription(jobDescription: string): string {
    return `You are an expert job analyst. Assess whether the following job description contains sufficient information for a proper skill gap analysis.

Job Description:
${jobDescription}

Provide a validation assessment in JSON format with the following fields:
{
  "isSufficient": boolean,
  "qualityScore": number (0-100),
  "missingElements": ["string"],
  "usableElements": ["string"],
  "recommendation": "string",
  "canProceed": boolean
}

Check for:
- Specific skills mentioned (technical, soft, domain)
- Experience requirements or levels
- Job responsibilities that imply required skills
- Industry or role context
- Clear requirements vs preferences

If insufficient, explain what specific information is missing and how the user can get better requirements.`
  }
}
