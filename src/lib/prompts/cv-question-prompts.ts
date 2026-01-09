// CV Information Collection Question Templates

export interface QuestionTemplate {
  id: string
  category: 'personal' | 'career' | 'experience' | 'formatting'
  text: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'yesno'
  required: boolean
  options?: string[]
  conditions?: {
    analysisField?: string
    improvementType?: string
    minValue?: number
    hasJobDescription?: boolean
    targetRoleLevel?: string
  }
  placeholder?: string
  maxLength?: number
}

export const CV_QUESTION_TEMPLATES: QuestionTemplate[] = [
  // Personal Information
  {
    id: 'full-name',
    category: 'personal',
    text: 'What is your full name as it should appear on your CV?',
    type: 'text',
    required: true,
    placeholder: 'John Doe',
    conditions: { hasJobDescription: false },
  },
  {
    id: 'professional-title',
    category: 'personal',
    text: 'What professional title best describes your current or desired role?',
    type: 'text',
    required: true,
    placeholder: 'Senior Software Engineer',
    conditions: { hasJobDescription: false },
  },
  {
    id: 'contact-email',
    category: 'personal',
    text: 'What email address should be used for professional inquiries?',
    type: 'text',
    required: true,
    placeholder: 'john.doe@example.com',
    conditions: { hasJobDescription: false },
  },
  {
    id: 'contact-phone',
    category: 'personal',
    text: 'What phone number should be included on your CV?',
    type: 'text',
    required: false,
    placeholder: '+1 (555) 123-4567',
    conditions: { hasJobDescription: false },
  },
  {
    id: 'linkedin-url',
    category: 'personal',
    text: 'What is your LinkedIn profile URL?',
    type: 'text',
    required: false,
    placeholder: 'https://linkedin.com/in/johndoe',
    conditions: { hasJobDescription: false },
  },
  {
    id: 'location',
    category: 'personal',
    text: 'What location should be displayed on your CV?',
    type: 'text',
    required: false,
    placeholder: 'San Francisco, CA',
    conditions: { hasJobDescription: false },
  },

  // Career Objectives
  {
    id: 'career-objective',
    category: 'career',
    text: 'What is your primary career objective or goal for this CV?',
    type: 'textarea',
    required: true,
    placeholder: 'Seeking a senior software engineering role where I can leverage my expertise in full-stack development...',
    maxLength: 300,
    conditions: { hasJobDescription: false },
  },
  {
    id: 'target-industries',
    category: 'career',
    text: 'Which industries are you targeting for your job search?',
    type: 'multiselect',
    required: false,
    options: [
      'Technology/Software',
      'Healthcare',
      'Finance',
      'Education',
      'Manufacturing',
      'Retail',
      'Consulting',
      'Government/Public Sector',
      'Non-profit',
      'Other',
    ],
    conditions: { hasJobDescription: false },
  },
  {
    id: 'target-role-level',
    category: 'career',
    text: 'What level of position are you seeking?',
    type: 'select',
    required: true,
    options: [
      'Entry Level (0-2 years)',
      'Junior (2-4 years)',
      'Mid-Level (4-7 years)',
      'Senior (7-10 years)',
      'Lead/Principal (10+ years)',
      'Manager/Director',
      'Executive (C-level)',
    ],
    conditions: { hasJobDescription: false },
  },
  {
    id: 'job-search-status',
    category: 'career',
    text: 'What is your current job search status?',
    type: 'select',
    required: false,
    options: [
      'Actively looking',
      'Open to opportunities',
      'Not actively looking but interested',
      'Exploring options',
    ],
    conditions: { hasJobDescription: false },
  },

  // Experience Preferences
  {
    id: 'years-experience',
    category: 'experience',
    text: 'How many years of professional experience do you have?',
    type: 'select',
    required: true,
    options: [
      '0-1 year',
      '1-2 years',
      '2-5 years',
      '5-10 years',
      '10-15 years',
      '15+ years',
    ],
    conditions: { hasJobDescription: false },
  },
  {
    id: 'key-achievements',
    category: 'experience',
    text: 'What are your 2-3 most significant professional achievements?',
    type: 'textarea',
    required: false,
    placeholder: 'Led a team of 5 engineers to deliver a major product launch 3 months ahead of schedule...',
    maxLength: 500,
    conditions: { analysisField: 'weaknesses' },
  },
  {
    id: 'technical-skills-highlight',
    category: 'experience',
    text: 'Which technical skills would you like to emphasize most on your CV?',
    type: 'multiselect',
    required: false,
    options: [
      'Programming Languages',
      'Frameworks/Libraries',
      'Database Technologies',
      'Cloud/DevOps',
      'Machine Learning/AI',
      'Mobile Development',
      'Frontend Technologies',
      'Backend Technologies',
      'Security',
      'Testing/Quality Assurance',
    ],
    conditions: { improvementType: 'skills' },
  },
  {
    id: 'leadership-experience',
    category: 'experience',
    text: 'Do you have leadership or management experience?',
    type: 'yesno',
    required: false,
    conditions: { targetRoleLevel: 'senior+' },
  },
  {
    id: 'remote-work-preference',
    category: 'experience',
    text: 'What is your preferred work arrangement?',
    type: 'select',
    required: false,
    options: [
      'Remote only',
      'Hybrid',
      'In-office only',
      'Flexible/Open to all',
    ],
    conditions: { hasJobDescription: false },
  },

  // Formatting Preferences
  {
    id: 'cv-format',
    category: 'formatting',
    text: 'Which CV format do you prefer?',
    type: 'select',
    required: true,
    options: [
      'Reverse Chronological (most recent first)',
      'Functional (skills-based)',
      'Combination (hybrid)',
      'No preference',
    ],
    conditions: { hasJobDescription: false },
  },
  {
    id: 'cv-length',
    category: 'formatting',
    text: 'What is your preferred CV length?',
    type: 'select',
    required: false,
    options: [
      '1 page',
      '2 pages',
      '3 pages',
      'No preference',
    ],
    conditions: { hasJobDescription: false },
  },
  {
    id: 'section-order',
    category: 'formatting',
    text: 'How would you like to order your CV sections?',
    type: 'select',
    required: false,
    options: [
      'Summary -> Experience -> Skills -> Education',
      'Experience -> Skills -> Education -> Summary',
      'Skills -> Experience -> Education -> Summary',
      'No preference',
    ],
    conditions: { hasJobDescription: false },
  },
  {
    id: 'include-photo',
    category: 'formatting',
    text: 'Would you like to include a professional photo on your CV?',
    type: 'yesno',
    required: false,
    conditions: { hasJobDescription: false },
  },

  // Job-Specific Questions (conditional)
  {
    id: 'company-alignment',
    category: 'career',
    text: 'Why are you interested in this specific company/role?',
    type: 'textarea',
    required: true,
    placeholder: 'I am particularly drawn to this company because...',
    maxLength: 300,
    conditions: { hasJobDescription: true },
  },
  {
    id: 'relevant-experience',
    category: 'experience',
    text: 'Which of your experiences are most relevant to this specific role?',
    type: 'textarea',
    required: true,
    placeholder: 'My experience at X company is particularly relevant because...',
    maxLength: 400,
    conditions: { hasJobDescription: true },
  },
  {
    id: 'gap-explanation',
    category: 'experience',
    text: 'Are there any gaps in your experience that need to be addressed for this role?',
    type: 'textarea',
    required: false,
    placeholder: 'While I may not have direct experience with X, I have...',
    maxLength: 300,
    conditions: { hasJobDescription: true, analysisField: 'weaknesses' },
  },
]

export function generateQuestions(
  cvAnalysis: {
    general?: {
      weaknesses?: string[]
    }
  },
  approvedImprovements: Array<{
    section?: string
  }>,
  hasJobDescription: boolean,
): QuestionTemplate[] {
  const selectedQuestionIds = new Set<string>()
  const questions: QuestionTemplate[] = []

  // Helper function to add questions without duplicates
  const addQuestions = (questionList: QuestionTemplate[]) => {
    questionList.forEach(question => {
      if (!selectedQuestionIds.has(question.id)) {
        selectedQuestionIds.add(question.id)
        questions.push(question)
      }
    })
  }

  // Always include essential personal and career questions
  addQuestions(
    CV_QUESTION_TEMPLATES.filter(q =>
      q.required &&
      (q.category === 'personal' || q.category === 'career') &&
      (!q.conditions?.hasJobDescription || q.conditions.hasJobDescription === hasJobDescription),
    ),
  )

  // Add conditional questions based on analysis
  if (cvAnalysis?.general?.weaknesses && cvAnalysis.general.weaknesses.length > 0) {
    addQuestions(
      CV_QUESTION_TEMPLATES.filter(q =>
        q.conditions?.analysisField === 'weaknesses',
      ),
    )
  }

  // Add questions based on approved improvements
  const improvementTypes = new Set(approvedImprovements.map(imp => imp.section?.toLowerCase()))
  if (improvementTypes.has('skills')) {
    addQuestions(
      CV_QUESTION_TEMPLATES.filter(q =>
        q.conditions?.improvementType === 'skills',
      ),
    )
  }

  // Add job-specific questions if job description is provided
  if (hasJobDescription) {
    addQuestions(
      CV_QUESTION_TEMPLATES.filter(q =>
        q.conditions?.hasJobDescription === true,
      ),
    )
  }

  // Add optional formatting questions
  addQuestions(
    CV_QUESTION_TEMPLATES.filter(q =>
      q.category === 'formatting' && !q.required,
    ),
  )

  // Sort by category and then by required status
  return questions.sort((a, b) => {
    if (a.category !== b.category) {
      const categoryOrder = ['personal', 'career', 'experience', 'formatting']
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    }
    if (a.required !== b.required) {
      return a.required ? -1 : 1
    }
    return 0
  })
}
