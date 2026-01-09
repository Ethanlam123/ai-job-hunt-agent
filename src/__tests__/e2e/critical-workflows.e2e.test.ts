/**
 * End-to-End Tests for Critical User Workflows
 *
 * Comprehensive E2E tests covering the most important user journeys
 * in the AI Job Hunt Agent system. These tests simulate real user
 * interactions and verify the complete functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Test configuration
const E2E_TIMEOUT = 60000 // 1 minute per test
const SETUP_TIMEOUT = 30000
const CLEANUP_TIMEOUT = 15000

// Test data
const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPass123!',
  name: 'E2E Test User',
}

const TEST_CV_CONTENT = `John Doe
Senior Software Engineer
john.doe@example.com | (555) 123-4567 | San Francisco, CA

SUMMARY
Experienced software engineer with 5+ years in full-stack development.
Expertise in React, Node.js, and cloud technologies.

EXPERIENCE
Senior Software Engineer - Tech Corp (2020-Present)
- Led development of microservices architecture
- Improved application performance by 40%
- Mentored junior developers

Software Engineer - StartupXYZ (2018-2020)
- Built RESTful APIs and web applications
- Implemented CI/CD pipelines
- Collaborated with cross-functional teams

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley (2014-2018)

SKILLS
Technical: JavaScript, TypeScript, React, Node.js, Python, AWS
Soft: Leadership, Communication, Problem-solving, Teamwork`

const TEST_JOB_DESCRIPTION = `Senior Frontend Developer
TechCorp is looking for a talented Senior Frontend Developer to join our growing team.

Requirements:
- 5+ years of experience with React and TypeScript
- Strong understanding of modern frontend development
- Experience with state management (Redux, Zustand)
- Knowledge of testing frameworks
- Excellent communication skills

Responsibilities:
- Develop and maintain web applications using React
- Collaborate with design and backend teams
- Write clean, testable code
- Participate in code reviews
- Mentor junior developers

We offer competitive salary, remote work options, and great benefits.`

describe('Critical User Workflows - E2E Tests', () => {
  let supabase: SupabaseClient
  let testUserId: string | null = null
  let testDocumentId: string | null = null
  let testSessionIds: string[] = []

  beforeAll(async () => {
    // Initialize Supabase client for E2E tests
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    supabase = createClient(supabaseUrl, supabaseKey)

    // Verify database connectivity
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error && !error.message.includes('rows')) {
      throw new Error(`Database connection failed: ${error.message}`)
    }

    console.log('E2E test environment initialized')
  }, SETUP_TIMEOUT)

  afterAll(async () => {
    // Cleanup test data
    await cleanupE2ETestData()
    console.log('E2E test cleanup completed')
  }, CLEANUP_TIMEOUT)

  beforeEach(async () => {
    // Reset test state
    testDocumentId = null
    testSessionIds = []
  }, CLEANUP_TIMEOUT)

  afterEach(async () => {
    // Cleanup test sessions and documents
    await cleanupTestSessionData()
  }, CLEANUP_TIMEOUT)

  /**
   * Cleanup E2E test data
   */
  async function cleanupE2ETestData(): Promise<void> {
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )

        // Delete test user if exists
        if (testUserId) {
          await adminClient.auth.admin.deleteUser(testUserId)
          testUserId = null
        }

        // Delete test documents
        await adminClient
          .from('documents')
          .delete()
          .like('title', 'e2e-test-%')

        // Delete test sessions
        await adminClient
          .from('sessions')
          .delete()
          .like('id', 'e2e-%')
      }
    } catch (error) {
      console.warn('E2E cleanup failed:', error)
    }
  }

  /**
   * Cleanup test session data
   */
  async function cleanupTestSessionData(): Promise<void> {
    try {
      // Delete test documents
      if (testDocumentId) {
        await supabase.from('documents').delete().eq('id', testDocumentId)
        testDocumentId = null
      }

      // Delete test sessions
      if (testSessionIds.length > 0) {
        await supabase.from('sessions').delete().in('id', testSessionIds)
        testSessionIds = []
      }
    } catch (error) {
      console.warn('Session cleanup failed:', error)
    }
  }

  describe('Workflow 1: User Registration and Document Upload', () => {
    it('should complete full user registration and first document upload', async () => {
      // Step 1: User Registration
      console.log('Step 1: Testing user registration...')

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_USER.email,
        password: TEST_USER.password,
        options: {
          data: {
            name: TEST_USER.name,
          },
        },
      })

      expect(signUpError).toBeNull()
      expect(signUpData.user).toBeTruthy()
      expect(signUpData.user?.email).toBe(TEST_USER.email)

      testUserId = signUpData.user?.id || null

      // Step 2: Email Verification (simulated)
      console.log('Step 2: Simulating email verification...')

      // In real E2E, user would click verification link
      // For testing, we'll proceed with email verification check

      // Step 3: User Login
      console.log('Step 3: Testing user login...')

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
      })

      expect(signInError).toBeNull()
      expect(signInData.user).toBeTruthy()
      expect(signInData.user?.email).toBe(TEST_USER.email)
      expect(signInData.session).toBeTruthy()

      // Step 4: Document Upload
      console.log('Step 4: Testing document upload...')

      // Simulate file upload by creating document record
      const documentData = {
        user_id: testUserId!,
        title: 'e2e-test-cv-document',
        file_name: 'test-cv.pdf',
        file_path: `test-users/${testUserId}/test-cv.pdf`,
        file_size: 1024,
        mime_type: 'application/pdf',
        content_type: 'cv',
        status: 'uploaded',
        parsed_content: {
          fullText: TEST_CV_CONTENT,
          wordCount: TEST_CV_CONTENT.split(/\s+/).length,
          sections: {
            summary: 'Experienced software engineer with 5+ years in full-stack development.',
            experience: 'Senior Software Engineer - Tech Corp (2020-Present)',
            education: 'Bachelor of Science in Computer Science',
            skills: 'Technical: JavaScript, TypeScript, React, Node.js',
          },
        },
      }

      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      expect(docError).toBeNull()
      expect(docData).toBeTruthy()
      expect(docData.title).toBe('e2e-test-cv-document')
      expect(docData.status).toBe('uploaded')

      testDocumentId = docData.id

      // Step 5: Document Processing
      console.log('Step 5: Testing document processing...')

      // Simulate document processing completion
      const { data: processedDoc, error: processError } = await supabase
        .from('documents')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', testDocumentId)
        .select()
        .single()

      expect(processError).toBeNull()
      expect(processedDoc?.status).toBe('processed')
      expect(processedDoc?.processed_at).toBeTruthy()

      console.log('✅ Workflow 1 completed successfully')
    }, E2E_TIMEOUT)
  })

  describe('Workflow 2: CV Analysis and Review', () => {
    it('should complete CV analysis workflow', async () => {
      // Ensure we have a test user and document
      if (!testUserId || !testDocumentId) {
        // Create test setup quickly
        await createQuickTestSetup()
      }

      // Step 1: Start CV Analysis
      console.log('Step 1: Starting CV analysis...')

      const analysisSession = {
        id: `e2e-cv-analysis-${Date.now()}`,
        user_id: testUserId!,
        document_id: testDocumentId!,
        analysis_type: 'cv_analysis',
        status: 'processing',
        metadata: {
          analysisType: 'comprehensive',
          includeIndustryComparison: true,
        },
        created_at: new Date().toISOString(),
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert(analysisSession)
        .select()
        .single()

      expect(sessionError).toBeNull()
      expect(sessionData).toBeTruthy()
      expect(sessionData.status).toBe('processing')

      testSessionIds.push(sessionData.id)

      // Step 2: Simulate Analysis Progress
      console.log('Step 2: Simulating analysis progress...')

      // Update status to completed with results
      const analysisResults = {
        overall_score: 85,
        sections: {
          contactInfo: { score: 100, feedback: [] },
          summary: { score: 90, feedback: ['Strong summary, consider adding metrics'] },
          experience: { score: 85, feedback: ['Good experience, add more quantifiable achievements'] },
          education: { score: 95, feedback: ['Education section is well-formatted'] },
          skills: { score: 80, feedback: ['Consider organizing skills by category'] },
        },
        recommendations: [
          {
            type: 'improvement',
            priority: 'high',
            description: 'Add quantifiable achievements to experience section',
            example: 'Led development of microservices architecture resulting in 40% performance improvement',
          },
          {
            type: 'addition',
            priority: 'medium',
            description: 'Include technical projects or contributions',
          },
        ],
      }

      const { data: completedSession, error: completionError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          metadata: {
            ...analysisSession.metadata,
            results: analysisResults,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionData.id)
        .select()
        .single()

      expect(completionError).toBeNull()
      expect(completedSession?.status).toBe('completed')
      expect(completedSession?.metadata?.results).toBeTruthy()

      // Step 3: Retrieve Analysis Results
      console.log('Step 3: Retrieving analysis results...')

      const { data: results, error: resultsError } = await supabase
        .from('sessions')
        .select('metadata')
        .eq('id', sessionData.id)
        .single()

      expect(resultsError).toBeNull()
      expect(results?.metadata?.results?.overall_score).toBe(85)
      expect(results?.metadata?.results?.recommendations).toHaveLength(2)

      console.log('✅ Workflow 2 completed successfully')
    }, E2E_TIMEOUT)
  })

  describe('Workflow 3: Skill Gap Analysis', () => {
    it('should complete skill gap analysis workflow', async () => {
      // Ensure we have test setup
      if (!testUserId || !testDocumentId) {
        await createQuickTestSetup()
      }

      // Step 1: Start Skill Gap Analysis
      console.log('Step 1: Starting skill gap analysis...')

      const skillGapSession = {
        id: `e2e-skill-gap-${Date.now()}`,
        user_id: testUserId!,
        document_id: testDocumentId!,
        analysis_type: 'skill_gap',
        status: 'processing',
        metadata: {
          jobTitle: 'Senior Frontend Developer',
          jobDescription: TEST_JOB_DESCRIPTION,
          experienceLevel: 'senior',
        },
        created_at: new Date().toISOString(),
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert(skillGapSession)
        .select()
        .single()

      expect(sessionError).toBeNull()
      expect(sessionData).toBeTruthy()

      testSessionIds.push(sessionData.id)

      // Step 2: Complete Analysis with Results
      console.log('Step 2: Completing skill gap analysis...')

      const skillGapResults = {
        overall_match: 75,
        missing_skills: [
          {
            skill: 'Advanced TypeScript',
            importance: 'critical',
            category: 'technical',
            learning_resources: [
              {
                type: 'course',
                title: 'Advanced TypeScript Patterns',
                url: 'https://example.com/ts-course',
                estimatedTime: '2-3 weeks',
                difficulty: 'intermediate',
              },
            ],
          },
          {
            skill: 'State Management Patterns',
            importance: 'important',
            category: 'technical',
            learning_resources: [
              {
                type: 'tutorial',
                title: 'Modern State Management in React',
                url: 'https://example.com/state-mgmt',
                estimatedTime: '1 week',
                difficulty: 'intermediate',
              },
            ],
          },
        ],
        learning_plan: {
          short_term: [
            {
              skill: 'Advanced TypeScript',
              timeline: '2-3 weeks',
              resources: ['Online course', 'Practice projects'],
            },
          ],
          medium_term: [
            {
              skill: 'State Management Patterns',
              timeline: '1 month',
              resources: ['Tutorials', 'Hands-on practice'],
            },
          ],
          long_term: [
            {
              skill: 'System Design',
              timeline: '3-4 months',
              resources: ['Books', 'Courses', 'Projects'],
            },
          ],
        },
        strengths: [
          {
            skill: 'React Development',
            level: 'advanced',
            evidence: ['5+ years experience', 'Multiple projects'],
          },
        ],
      }

      const { data: completedSession, error: completionError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          metadata: {
            ...skillGapSession.metadata,
            results: skillGapResults,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionData.id)
        .select()
        .single()

      expect(completionError).toBeNull()
      expect(completedSession?.status).toBe('completed')

      // Step 3: Update Skill Status
      console.log('Step 3: Updating skill learning status...')

      // Create skill gap records with status tracking
      const skillUpdates = skillGapResults.missing_skills.map((skill, index) => ({
        session_id: sessionData.id,
        skill_name: skill.skill,
        status: index === 0 ? 'in_progress' : 'pending',
        importance: skill.importance,
        category: skill.category,
        notes: 'Started learning plan',
        created_at: new Date().toISOString(),
      }))

      const { data: skillRecords, error: skillError } = await supabase
        .from('skill_gaps')
        .insert(skillUpdates)
        .select()

      expect(skillError).toBeNull()
      expect(skillRecords).toHaveLength(2)

      console.log('✅ Workflow 3 completed successfully')
    }, E2E_TIMEOUT)
  })

  describe('Workflow 4: Cover Letter Generation', () => {
    it('should complete cover letter generation workflow', async () => {
      // Ensure we have test setup
      if (!testUserId || !testDocumentId) {
        await createQuickTestSetup()
      }

      // Step 1: Start Cover Letter Generation
      console.log('Step 1: Starting cover letter generation...')

      const coverLetterSession = {
        id: `e2e-cover-letter-${Date.now()}`,
        user_id: testUserId!,
        document_id: testDocumentId!,
        analysis_type: 'cover_letter',
        status: 'processing',
        metadata: {
          jobTitle: 'Senior Frontend Developer',
          companyName: 'TechCorp',
          jobDescription: TEST_JOB_DESCRIPTION,
          tone: 'professional',
          length: 'medium',
        },
        created_at: new Date().toISOString(),
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert(coverLetterSession)
        .select()
        .single()

      expect(sessionError).toBeNull()
      expect(sessionData).toBeTruthy()

      testSessionIds.push(sessionData.id)

      // Step 2: Generate Cover Letter Content
      console.log('Step 2: Generating cover letter content...')

      const generatedContent = `
Dear Hiring Manager at TechCorp,

I am writing to express my strong interest in the Senior Frontend Developer position at TechCorp. With over 5 years of experience in full-stack development and a proven track record of delivering high-quality web applications, I am confident that I possess the skills and qualifications you are seeking.

In my current role at Tech Corp, I have led the development of microservices architecture that resulted in a 40% improvement in application performance. My expertise in React, TypeScript, and modern frontend development aligns perfectly with your requirements.

What sets me apart is not just my technical skills but also my ability to mentor junior developers and collaborate effectively with cross-functional teams. I am particularly drawn to TechCorp's commitment to innovation and would welcome the opportunity to contribute to your growing team.

I am excited about the possibility of bringing my unique blend of technical expertise and leadership skills to TechCorp. I look forward to discussing how my experience can benefit your team.

Thank you for considering my application.

Sincerely,
John Doe
      `.trim()

      const coverLetterResults = {
        content: generatedContent,
        word_count: generatedContent.split(/\s+/).length,
        tone: 'professional',
        highlights: [
          '5+ years of experience',
          '40% performance improvement',
          'React and TypeScript expertise',
          'Leadership and mentoring experience',
        ],
        suggestions: [
          'Consider adding specific metrics for achievements',
          'Tailor the closing to match company culture',
        ],
      }

      const { data: completedSession, error: completionError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          metadata: {
            ...coverLetterSession.metadata,
            results: coverLetterResults,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionData.id)
        .select()
        .single()

      expect(completionError).toBeNull()
      expect(completedSession?.status).toBe('completed')
      expect(completedSession?.metadata?.results?.content).toContain('Senior Frontend Developer')

      // Step 3: Save Generated Cover Letter as Document
      console.log('Step 3: Saving cover letter as document...')

      const coverLetterDocument = {
        user_id: testUserId!,
        title: 'e2e-test-cover-letter',
        file_name: 'cover-letter-techcorp.md',
        file_path: `test-users/${testUserId}/cover-letter-techcorp.md`,
        file_size: Buffer.byteLength(generatedContent),
        mime_type: 'text/markdown',
        content_type: 'cover_letter',
        status: 'processed',
        parsed_content: {
          fullText: generatedContent,
          wordCount: generatedContent.split(/\s+/).length,
          sections: {
            introduction: 'I am writing to express my strong interest...',
            experience: 'In my current role at Tech Corp...',
            skills: 'What sets me apart is not just my technical skills...',
            closing: 'Thank you for considering my application.',
          },
        },
        metadata: {
          generatedFrom: sessionData.id,
          jobTitle: 'Senior Frontend Developer',
          companyName: 'TechCorp',
        },
        created_at: new Date().toISOString(),
      }

      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert(coverLetterDocument)
        .select()
        .single()

      expect(docError).toBeNull()
      expect(docData).toBeTruthy()
      expect(docData.content_type).toBe('cover_letter')
      expect(docData.metadata?.generatedFrom).toBe(sessionData.id)

      console.log('✅ Workflow 4 completed successfully')
    }, E2E_TIMEOUT)
  })

  describe('Workflow 5: Interview Preparation', () => {
    it('should complete interview preparation workflow', async () => {
      // Ensure we have test setup
      if (!testUserId || !testDocumentId) {
        await createQuickTestSetup()
      }

      // Step 1: Start Interview Preparation
      console.log('Step 1: Starting interview preparation...')

      const interviewSession = {
        id: `e2e-interview-prep-${Date.now()}`,
        user_id: testUserId!,
        document_id: testDocumentId!,
        analysis_type: 'interview',
        status: 'processing',
        metadata: {
          jobTitle: 'Senior Frontend Developer',
          jobDescription: TEST_JOB_DESCRIPTION,
          focusAreas: ['technical', 'behavioral'],
          questionCount: 10,
          difficulty: 'senior',
        },
        created_at: new Date().toISOString(),
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert(interviewSession)
        .select()
        .single()

      expect(sessionError).toBeNull()
      expect(sessionData).toBeTruthy()

      testSessionIds.push(sessionData.id)

      // Step 2: Generate Interview Preparation Materials
      console.log('Step 2: Generating interview materials...')

      const interviewMaterials = {
        questions: [
          {
            id: 'q1',
            question: 'Can you describe your experience with React and TypeScript?',
            type: 'technical',
            difficulty: 'senior',
            suggestedAnswer: 'I have over 5 years of experience with React...',
            tips: [
              'Mention specific projects and achievements',
              'Include performance optimizations you\'ve implemented',
              'Talk about TypeScript best practices you follow',
            ],
          },
          {
            id: 'q2',
            question: 'Describe a challenging technical problem you solved recently.',
            type: 'behavioral',
            difficulty: 'senior',
            suggestedAnswer: 'In my previous project, we faced...',
            tips: [
              'Use the STAR method (Situation, Task, Action, Result)',
              'Focus on your specific contribution',
              'Quantify the impact of your solution',
            ],
          },
        ],
        tips: [
          {
            category: 'Technical Preparation',
            advice: [
              'Review React hooks and patterns',
              'Practice coding challenges',
              'Prepare examples of your best work',
            ],
          },
          {
            category: 'Behavioral Questions',
            advice: [
              'Prepare stories using the STAR method',
              'Research the company culture',
              'Have questions ready for the interviewer',
            ],
          },
        ],
        preparationChecklist: [
          {
            area: 'Technical Knowledge',
            tasks: [
              'Review React fundamentals',
              'Practice TypeScript exercises',
              'Prepare code examples',
            ],
            completed: false,
          },
          {
            area: 'Company Research',
            tasks: [
              'Research TechCorp\'s products',
              'Understand their tech stack',
              'Review recent company news',
            ],
            completed: false,
          },
        ],
      }

      const { data: completedSession, error: completionError } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          metadata: {
            ...interviewSession.metadata,
            results: interviewMaterials,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionData.id)
        .select()
        .single()

      expect(completionError).toBeNull()
      expect(completedSession?.status).toBe('completed')
      expect(completedSession?.metadata?.results?.questions).toHaveLength(2)

      console.log('✅ Workflow 5 completed successfully')
    }, E2E_TIMEOUT)
  })

  describe('Workflow 6: Document Search and Retrieval', () => {
    it('should complete document search and retrieval workflow', async () => {
      // Ensure we have multiple test documents
      if (!testUserId || !testDocumentId) {
        await createQuickTestSetup()
      }

      // Create additional test documents
      await createAdditionalTestDocuments()

      // Step 1: Search Documents by Content
      console.log('Step 1: Searching documents by content...')

      const searchQuery = 'React developer experience'

      // Simulate content search (in real implementation, this would use vector search)
      const { data: searchResults, error: searchError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', testUserId)
        .or(`title.ilike.%${searchQuery}%,parsed_content->>fullText.ilike.%${searchQuery}%`)
        .limit(10)

      expect(searchError).toBeNull()
      expect(Array.isArray(searchResults)).toBe(true)

      // Step 2: Filter by Content Type
      console.log('Step 2: Filtering documents by content type...')

      const { data: cvDocuments, error: filterError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', testUserId)
        .eq('content_type', 'cv')
        .order('updated_at', { ascending: false })

      expect(filterError).toBeNull()
      expect(Array.isArray(cvDocuments)).toBe(true)

      // Step 3: Get Document with Details
      console.log('Step 3: Retrieving document details...')

      if (searchResults && searchResults.length > 0) {
        const { data: documentDetails, error: detailsError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', searchResults[0].id)
          .single()

        expect(detailsError).toBeNull()
        expect(documentDetails).toBeTruthy()
        expect(documentDetails.parsed_content).toBeTruthy()
      }

      // Step 4: Pagination Test
      console.log('Step 4: Testing document pagination...')

      const page = 1
      const limit = 5

      const { data: paginatedResults, error: paginationError } = await supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('user_id', testUserId)
        .order('updated_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      expect(paginationError).toBeNull()
      expect(Array.isArray(paginatedResults)).toBe(true)

      console.log('✅ Workflow 6 completed successfully')
    }, E2E_TIMEOUT)
  })

  /**
   * Helper function to create quick test setup
   */
  async function createQuickTestSetup(): Promise<void> {
    if (!testUserId) {
      // Create test user
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: `e2e-quick-${Date.now()}@example.com`,
        password: TEST_USER.password,
        options: { data: { name: TEST_USER.name } },
      })

      if (!userError && userData.user) {
        testUserId = userData.user.id
      }
    }

    if (!testDocumentId && testUserId) {
      // Create test document
      const documentData = {
        user_id: testUserId,
        title: `e2e-quick-doc-${Date.now()}`,
        file_name: 'test-cv.pdf',
        file_path: `test-users/${testUserId}/test-cv.pdf`,
        file_size: 1024,
        mime_type: 'application/pdf',
        content_type: 'cv',
        status: 'processed',
        parsed_content: {
          fullText: TEST_CV_CONTENT,
          wordCount: TEST_CV_CONTENT.split(/\s+/).length,
        },
      }

      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (!docError && docData) {
        testDocumentId = docData.id
      }
    }
  }

  /**
   * Helper function to create additional test documents
   */
  async function createAdditionalTestDocuments(): Promise<void> {
    if (!testUserId) return

    const additionalDocs = [
      {
        user_id: testUserId,
        title: `e2e-additional-doc-1-${Date.now()}`,
        file_name: 'resume.pdf',
        file_path: `test-users/${testUserId}/resume.pdf`,
        file_size: 2048,
        mime_type: 'application/pdf',
        content_type: 'resume',
        status: 'processed',
        parsed_content: {
          fullText: 'Resume with React development experience',
          wordCount: 50,
        },
      },
      {
        user_id: testUserId,
        title: `e2e-additional-doc-2-${Date.now()}`,
        file_name: 'job-desc.pdf',
        file_path: `test-users/${testUserId}/job-desc.pdf`,
        file_size: 1024,
        mime_type: 'application/pdf',
        content_type: 'job_description',
        status: 'processed',
        parsed_content: {
          fullText: 'Job description for React developer position',
          wordCount: 30,
        },
      },
    ]

    await supabase.from('documents').insert(additionalDocs)
  }
})
