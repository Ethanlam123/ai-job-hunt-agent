/**
 * Interview Preparation Prompts for LLM interactions
 */

export class InterviewPrompts {
  /**
   * Generate interview questions based on CV and job description
   */
  static generateQuestions(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cvContent: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jdContent: any,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    questionCount: number = 10
  ): string {
    return `You are an expert technical interviewer. Generate ${questionCount} interview questions based on the candidate's CV and the job description.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Job Description:
${JSON.stringify(jdContent, null, 2)}

Difficulty Level: ${difficulty}

Generate questions in JSON format:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "behavioral" | "technical" | "situational" | "competency",
      "category": "experience" | "skills" | "culture-fit" | "problem-solving" | "leadership",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "question": "The interview question",
      "expectedAnswer": "For JD-based/technical questions only: what a strong answer includes. For CV-based questions about candidate's experience, leave this empty or null since the candidate knows their own experience better than the interviewer",
      "evaluationCriteria": [
        "Key point 1 to evaluate (focus on structure, clarity, and depth for CV-based questions)",
        "Key point 2 to evaluate"
      ],
      "reasoning": "Why this question is relevant for this candidate and role"
    }
  ],
  "interviewStructure": {
    "opening": string,
    "focusAreas": string[],
    "closingTopics": string[]
  }
}

Guidelines:
- Mix question types (30% behavioral, 40% technical, 20% situational, 10% competency)
- Align questions with CV experience and JD requirements

**For CV-based/behavioral questions:**
- Ask about specific projects, achievements, or experiences mentioned in the CV
- Do NOT provide expected answers - the candidate's actual experience IS the answer
- Focus evaluation criteria on: clarity, STAR method usage, depth of reflection, lessons learned
- Examples: "Tell me about [project X] from your CV", "How did you handle [situation Y]?"

**For JD-based/technical questions:**
- Ask about skills, technologies, or competencies required by the job description
- Provide expected answers with key technical points or best practices
- Focus evaluation criteria on: technical accuracy, depth of knowledge, practical application
- Examples: "How would you implement [JD requirement]?", "Explain your approach to [technical challenge]"

Additional guidelines:
- Include questions that probe specific achievements mentioned in CV
- Test both depth of knowledge and breadth of experience
- Include questions about gaps or transitions in career (if any)
- Ensure questions are clear and unambiguous
- Avoid discriminatory or inappropriate questions

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Evaluate candidate's answer to an interview question
   */
  static evaluateAnswer(
    question: string,
    expectedAnswer: string,
    candidateAnswer: string,
    evaluationCriteria: string[]
  ): string {
    const hasExpectedAnswer = expectedAnswer && expectedAnswer.trim().length > 0

    return `You are an expert interviewer evaluating a candidate's response. Provide detailed feedback.

Question:
${question}

${hasExpectedAnswer ? `Expected Answer Points:\n${expectedAnswer}\n` : `Note: This is a CV-based/behavioral question. The candidate's actual experience is the correct answer. Focus on evaluating the QUALITY of their response (clarity, structure, depth, reflection) rather than comparing to an expected answer.\n`}
Evaluation Criteria:
${evaluationCriteria.join('\n')}

Candidate's Answer:
${candidateAnswer}

Provide evaluation in JSON format:
{
  "score": number (0-10),
  "strengths": [
    {
      "point": "What was done well",
      "explanation": "Why this was good"
    }
  ],
  "weaknesses": [
    {
      "point": "What was missing or weak",
      "explanation": "Why this matters"
    }
  ],
  "missingPoints": string[],
  "overallFeedback": "Summary of the answer quality",
  "improvementSuggestions": [
    {
      "area": "Specific aspect to improve",
      "suggestion": "How to improve it",
      "example": "Example of a better response"
    }
  ],
  "followUpQuestions": [
    "Potential follow-up question 1",
    "Potential follow-up question 2"
  ]
}

Evaluation Guidelines:
- Be constructive and specific in feedback
- Recognize both strengths and areas for improvement

${hasExpectedAnswer ?
  `For technical/JD-based questions:
- Assess technical accuracy and completeness
- Compare answer to expected answer points
- Evaluate depth of knowledge and practical understanding
- Check if all key concepts from expected answer are covered`
  :
  `For CV-based/behavioral questions:
- Do NOT penalize for differences from "expected answer" - there is no single correct answer
- Evaluate using STAR method: Situation, Task, Action, Result
- Assess clarity, structure, and depth of reflection
- Look for specific examples and measurable outcomes
- Evaluate lessons learned and self-awareness
- Consider authenticity and relevance to their actual experience`}

General evaluation:
- Evaluate overall clarity and communication skills
- Note if the answer directly addresses the question
- Identify areas for improvement with specific, actionable suggestions

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Analyze overall interview performance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static analyzeInterviewPerformance(
    questions: any[],
    answers: any[],
    evaluations: any[]
  ): string {
    return `You are an interview coach analyzing a candidate's overall interview performance.

Questions Asked:
${JSON.stringify(questions, null, 2)}

Candidate Answers:
${JSON.stringify(answers, null, 2)}

Individual Evaluations:
${JSON.stringify(evaluations, null, 2)}

Provide comprehensive performance analysis in JSON format:
{
  "overallScore": number (0-100),
  "categoryScores": {
    "behavioral": number (0-100),
    "technical": number (0-100),
    "situational": number (0-100),
    "competency": number (0-100)
  },
  "strengthAreas": [
    {
      "area": string,
      "description": string,
      "examples": string[]
    }
  ],
  "improvementAreas": [
    {
      "area": string,
      "description": string,
      "priority": "high" | "medium" | "low",
      "actionItems": string[]
    }
  ],
  "communicationSkills": {
    "score": number (0-100),
    "clarity": "excellent" | "good" | "fair" | "poor",
    "structure": "excellent" | "good" | "fair" | "poor",
    "conciseness": "excellent" | "good" | "fair" | "poor",
    "notes": string[]
  },
  "technicalCompetence": {
    "score": number (0-100),
    "depth": "excellent" | "good" | "fair" | "poor",
    "breadth": "excellent" | "good" | "fair" | "poor",
    "notes": string[]
  },
  "hiringRecommendation": {
    "decision": "strong-yes" | "yes" | "maybe" | "no" | "strong-no",
    "reasoning": string,
    "concerns": string[],
    "positives": string[]
  },
  "preparationTips": [
    {
      "topic": string,
      "recommendation": string,
      "resources": string[]
    }
  ]
}

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Generate practice tips and preparation guidance
   */
  static generatePreparationGuide(
    cvContent: any,
    jdContent: any,
    weakAreas: string[]
  ): string {
    return `You are an interview preparation coach. Create a personalized preparation guide.

CV Content:
${JSON.stringify(cvContent, null, 2)}

Job Description:
${JSON.stringify(jdContent, null, 2)}

Identified Weak Areas:
${weakAreas.join('\n')}

Generate preparation guide in JSON format:
{
  "preparationTimeline": {
    "immediate": string[],
    "oneWeekBefore": string[],
    "oneDayBefore": string[],
    "dayOf": string[]
  },
  "studyTopics": [
    {
      "topic": string,
      "priority": "critical" | "high" | "medium" | "low",
      "estimatedTime": "hours needed to prepare",
      "resources": string[],
      "keyPoints": string[]
    }
  ],
  "practiceQuestions": [
    {
      "category": string,
      "question": string,
      "sampleAnswer": string
    }
  ],
  "storyBank": [
    {
      "theme": string,
      "situation": "Suggested scenario from CV to prepare",
      "starFramework": {
        "situation": string,
        "task": string,
        "action": string,
        "result": string
      }
    }
  ],
  "commonPitfalls": [
    {
      "pitfall": string,
      "howToAvoid": string
    }
  ],
  "confidenceBuilders": string[]
}

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Generate follow-up questions based on initial answer
   */
  static generateFollowUpQuestions(
    originalQuestion: string,
    candidateAnswer: string,
    depth: number = 2
  ): string {
    return `Based on the candidate's answer, generate ${depth} insightful follow-up questions to probe deeper.

Original Question:
${originalQuestion}

Candidate's Answer:
${candidateAnswer}

Generate follow-up questions in JSON format:
{
  "followUpQuestions": [
    {
      "question": string,
      "purpose": "What this question aims to uncover",
      "type": "clarification" | "depth" | "behavioral" | "technical",
      "expectedInsight": "What a good answer would reveal"
    }
  ]
}

Guidelines:
- Ask questions that dig deeper into specific claims or achievements
- Probe for technical details if the answer was high-level
- Ask for specific examples if the answer was vague
- Challenge assumptions or ask about trade-offs for technical decisions
- Explore the "why" behind decisions mentioned

Return ONLY valid JSON, no markdown or additional text.`
  }

  /**
   * Generate company research questions
   */
  static generateCompanyResearchQuestions(jdContent: any): string {
    return `Based on the job description, generate thoughtful questions the candidate should ask the interviewer.

Job Description:
${JSON.stringify(jdContent, null, 2)}

Generate questions in JSON format:
{
  "questionsForInterviewer": [
    {
      "question": string,
      "category": "role" | "team" | "company" | "culture" | "growth" | "technical",
      "purpose": "What this question demonstrates about the candidate",
      "goodToAsk": "early-interview" | "mid-interview" | "end-interview"
    }
  ],
  "researchTopics": [
    {
      "topic": string,
      "why": "Why researching this matters",
      "sources": string[]
    }
  ]
}

Guidelines:
- Generate 8-12 thoughtful questions
- Avoid questions easily answered by the company website
- Show genuine interest in the role and company
- Demonstrate strategic thinking
- Include questions about team dynamics and growth opportunities

Return ONLY valid JSON, no markdown or additional text.`
  }
}
