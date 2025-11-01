import { createLLM } from './llm-service'

export interface CoverLetterInput {
  cvContent: string
  jobDescription: string
  companyName: string
  positionTitle: string
  hiringManagerName?: string
}

export interface CoverLetterOutput {
  coverLetter: string
  metadata: {
    companyName: string
    positionTitle: string
    generatedAt: string
  }
}

export async function generateCoverLetter(input: CoverLetterInput): Promise<CoverLetterOutput> {
  const prompt = buildPrompt(input)

  // Debug: Check if API key is available
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set!')
    throw new Error('OpenRouter API key is not configured')
  }

  console.log('Creating LLM with OpenRouter...')
  const llm = createLLM({
    model: 'openai/gpt-5-nano', // Same model used by CV agent
    temperature: 0.7,
    maxTokens: 6000
  })

  const systemMessage = `You are an expert career coach and professional cover letter writer. Your task is to create compelling, personalized cover letters that:
1. Highlight the candidate's most relevant skills and experiences from their CV
2. Align with the specific job requirements and company culture
3. Demonstrate genuine interest and fit for the position
4. Use a professional yet personable tone
5. Are concise (typically 3-4 paragraphs, under 400 words)
6. Follow standard business letter format

Always start with a strong opening that captures attention, provide concrete examples from the CV that match job requirements, and close with a clear call to action.`

  const messages = [
    { role: 'system' as const, content: systemMessage },
    { role: 'user' as const, content: prompt }
  ]

  const response = await llm.invoke(messages)
  const coverLetter = response.content.toString().trim()

  return {
    coverLetter,
    metadata: {
      companyName: input.companyName,
      positionTitle: input.positionTitle,
      generatedAt: new Date().toISOString()
    }
  }
}

function buildPrompt(input: CoverLetterInput): string {
    const greeting = input.hiringManagerName
      ? `Dear ${input.hiringManagerName},`
      : 'Dear Hiring Manager,'

    return `Generate a professional cover letter for the following job application:

**Position**: ${input.positionTitle}
**Company**: ${input.companyName}
**Greeting**: ${greeting}

**Job Description**:
${input.jobDescription}

**Candidate's CV Content**:
${input.cvContent}

Instructions:
1. Start with the greeting: "${greeting}"
2. Opening paragraph: Express enthusiasm for the position and briefly explain why you're a great fit
3. Body paragraphs (1-2): Highlight 2-3 specific achievements or experiences from the CV that directly relate to the job requirements. Use concrete examples and metrics where available.
4. Closing paragraph: Reiterate interest, mention availability for an interview, and thank them for their consideration
5. Sign off with "Sincerely," followed by a blank line for the signature

Requirements:
- Use a professional, confident, and personable tone
- Be specific - reference actual skills and experiences from the CV
- Match the language and terminology from the job description
- Keep it concise (under 400 words)
- Avoid clichés and generic statements
- Focus on what value the candidate can bring to the company

Generate the complete cover letter now:`
}
