/**
 * API Documentation
 *
 * Comprehensive JSDoc documentation for all public APIs,
 * endpoints, and services. This serves as the official
 * API reference for the AI Job Hunt Agent system.
 */

/**
 * ============================================================================
 * AUTHENTICATION API
 * ============================================================================
 */

/**
 * User authentication and session management
 * @namespace AuthAPI
 */

/**
 * Sign up a new user with email and password
 * @function
 * @async
 * @param {Object} credentials - User registration data
 * @param {string} credentials.email - User's email address (must be valid format)
 * @param {string} credentials.password - User's password (min 8 characters, must contain uppercase, lowercase, number, and special character)
 * @param {string} [credentials.name] - User's display name
 * @returns {Promise<AuthResponse>} Authentication response with user data and session
 * @throws {ValidationError} When email format is invalid or password doesn't meet requirements
 * @throws {ConflictError} When email already exists
 * @throws {RateLimitError} When too many signup attempts
 * @example
 * ```typescript
 * try {
 *   const result = await signUp({
 *     email: 'user@example.com',
 *     password: 'SecurePass123!',
 *     name: 'John Doe'
 *   });
 *   console.log('User signed up:', result.user);
 * } catch (error) {
 *   console.error('Signup failed:', error.message);
 * }
 * ```
 */
export declare function signUp(credentials: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResponse>;

/**
 * Sign in user with email and password
 * @function
 * @async
 * @param {Object} credentials - User login data
 * @param {string} credentials.email - User's email address
 * @param {string} credentials.password - User's password
 * @returns {Promise<AuthResponse>} Authentication response with user data and session
 * @throws {ValidationError} When email format is invalid
 * @throws {AuthenticationError} When email/password combination is invalid
 * @throws {AccountLockedError} When account is locked due to too many failed attempts
 * @throws {RateLimitError} When too many login attempts
 * @example
 * ```typescript
 * try {
 *   const result = await signIn({
 *     email: 'user@example.com',
 *     password: 'SecurePass123!'
 *   });
 *   console.log('User signed in:', result.user.email);
 * } catch (error) {
 *   console.error('Sign in failed:', error.message);
 * }
 * ```
 */
export declare function signIn(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse>;

/**
 * Sign out current user and invalidate session
 * @function
 * @async
 * @returns {Promise<void>}
 * @example
 * ```typescript
 * await signOut();
 * console.log('User signed out');
 * ```
 */
export declare function signOut(): Promise<void>;

/**
 * Request password reset email
 * @function
 * @async
 * @param {string} email - User's email address
 * @returns {Promise<void>}
 * @throws {ValidationError} When email format is invalid
 * @throws {NotFoundError} When email is not registered
 * @example
 * ```typescript
 * await requestPasswordReset('user@example.com');
 * console.log('Password reset email sent');
 * ```
 */
export declare function requestPasswordReset(email: string): Promise<void>;

/**
 * ============================================================================
 * DOCUMENTS API
 * ============================================================================
 */

/**
 * Document management and processing
 * @namespace DocumentsAPI
 */

/**
 * Upload a new document to the system
 * @function
 * @async
 * @param {FormData} formData - Form data containing file and metadata
 * @param {File} formData.file - Document file (PDF, DOCX, TXT, or Markdown)
 * @param {string} formData.title - Document title
 * @param {string} formData.contentType - Type of content ('cv', 'resume', 'cover_letter', 'job_description', 'other')
 * @returns {Promise<DocumentUploadResponse>} Uploaded document information
 * @throws {ValidationError} When file format, size, or metadata is invalid
 * @throws {StorageError} When file upload to storage fails
 * @throws {RateLimitError} When upload limit is exceeded
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 * formData.append('title', 'My Resume');
 * formData.append('contentType', 'cv');
 *
 * try {
 *   const result = await uploadDocument(formData);
 *   console.log('Document uploaded:', result.id);
 * } catch (error) {
 *   console.error('Upload failed:', error.message);
 * }
 * ```
 */
export declare function uploadDocument(formData: FormData): Promise<DocumentUploadResponse>;

/**
 * Get list of user's documents with pagination
 * @function
 * @async
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number (1-based)
 * @param {number} [options.limit=20] - Number of documents per page (max 100)
 * @param {string} [options.contentType] - Filter by content type
 * @param {string} [options.status] - Filter by processing status
 * @returns {Promise<DocumentListResponse>} Paginated list of documents
 * @throws {ValidationError} When pagination parameters are invalid
 * @example
 * ```typescript
 * const documents = await getDocuments({
 *   page: 1,
 *   limit: 10,
 *   contentType: 'cv',
 *   status: 'processed'
 * });
 * console.log(`Found ${documents.total} documents`);
 * ```
 */
export declare function getDocuments(options?: {
  page?: number;
  limit?: number;
  contentType?: string;
  status?: string;
}): Promise<DocumentListResponse>;

/**
 * Get detailed information about a specific document
 * @function
 * @async
 * @param {string} documentId - Document UUID
 * @returns {Promise<DocumentDetailsResponse>} Document details with parsed content
 * @throws {NotFoundError} When document doesn't exist or user doesn't have access
 * @throws {ValidationError} When document ID format is invalid
 * @example
 * ```typescript
 * try {
 *   const document = await getDocument('123e4567-e89b-12d3-a456-426614174000');
 *   console.log('Document title:', document.title);
 *   console.log('Parsed content:', document.parsedContent?.fullText);
 * } catch (error) {
 *   console.error('Failed to get document:', error.message);
 * }
 * ```
 */
export declare function getDocument(documentId: string): Promise<DocumentDetailsResponse>;

/**
 * Delete a document and all associated data
 * @function
 * @async
 * @param {string} documentId - Document UUID
 * @returns {Promise<void>}
 * @throws {NotFoundError} When document doesn't exist or user doesn't have access
 * @throws {ValidationError} When document ID format is invalid
 * @example
 * ```typescript
 * try {
 *   await deleteDocument('123e4567-e89b-12d3-a456-426614174000');
 *   console.log('Document deleted successfully');
 * } catch (error) {
 *   console.error('Failed to delete document:', error.message);
 * }
 * ```
 */
export declare function deleteDocument(documentId: string): Promise<void>;

/**
 * ============================================================================
 * CV ANALYSIS API
 * ============================================================================
 */

/**
 * CV analysis and improvement suggestions
 * @namespace CVAnalysisAPI
 */

/**
 * Start CV analysis for a document
 * @function
 * @async
 * @param {Object} params - Analysis parameters
 * @param {string} params.documentId - Document UUID to analyze
 * @param {string} [params.analysisType='comprehensive'] - Type of analysis ('comprehensive', 'skills', 'formatting', 'content')
 * @param {Object} [params.options] - Additional analysis options
 * @param {boolean} [params.options.includeIndustryComparison=false] - Compare with industry standards
 * @param {string[]} [params.options.focusAreas] - Specific areas to focus on
 * @returns {Promise<CVAnalysisResponse>} Analysis session information
 * @throws {NotFoundError} When document doesn't exist
 * @throws {ValidationError} When document is not a CV or analysis parameters are invalid
 * @throws {ProcessingError} When document is not yet processed
 * @example
 * ```typescript
 * try {
 *   const analysis = await analyzeCV({
 *     documentId: '123e4567-e89b-12d3-a456-426614174000',
 *     analysisType: 'comprehensive',
 *     options: {
 *       includeIndustryComparison: true,
 *       focusAreas: ['skills', 'experience']
 *     }
 *   });
 *   console.log('Analysis started:', analysis.sessionId);
 * } catch (error) {
 *   console.error('Analysis failed:', error.message);
 * }
 * ```
 */
export declare function analyzeCV(params: {
  documentId: string;
  analysisType?: 'comprehensive' | 'skills' | 'formatting' | 'content';
  options?: {
    includeIndustryComparison?: boolean;
    focusAreas?: string[];
  };
}): Promise<CVAnalysisResponse>;

/**
 * Get CV analysis results
 * @function
 * @async
 * @param {string} sessionId - Analysis session UUID
 * @returns {Promise<CVAnalysisResultResponse>} Detailed analysis results
 * @throws {NotFoundError} When analysis session doesn't exist or user doesn't have access
 * @throws {ProcessingError} When analysis is not yet completed
 * @example
 * ```typescript
 * try {
 *   const result = await getCVAnalysisResult('session-uuid');
 *   console.log('Overall score:', result.overallScore);
 *   console.log('Recommendations:', result.recommendations);
 * } catch (error) {
 *   console.error('Failed to get analysis result:', error.message);
 * }
 * ```
 */
export declare function getCVAnalysisResult(sessionId: string): Promise<CVAnalysisResultResponse>;

/**
 * Get CV analysis status
 * @function
 * @async
 * @param {string} sessionId - Analysis session UUID
 * @returns {Promise<AnalysisStatusResponse>} Current analysis status
 * @throws {NotFoundError} When analysis session doesn't exist
 * @example
 * ```typescript
 * const status = await getCVAnalysisStatus('session-uuid');
 * console.log('Status:', status.status); // 'processing', 'completed', 'failed'
 * console.log('Progress:', status.progressPercentage);
 * ```
 */
export declare function getCVAnalysisStatus(sessionId: string): Promise<AnalysisStatusResponse>;

/**
 * ============================================================================
 * SKILL GAP ANALYSIS API
 * ============================================================================
 */

/**
 * Skill gap analysis between CV and job requirements
 * @namespace SkillGapAPI
 */

/**
 * Start skill gap analysis
 * @function
 * @async
 * @param {Object} params - Analysis parameters
 * @param {string} params.cvDocumentId - CV document UUID
 * @param {string} params.jobDescriptionText - Job description text
 * @param {string} [params.jobTitle] - Job title for context
 * @param {Object} [params.options] - Analysis options
 * @param {string[]} [params.options.prioritySkills] - Skills to prioritize
 * @param {string} [params.options.experienceLevel='mid'] - Experience level context
 * @returns {Promise<SkillGapAnalysisResponse>} Analysis session information
 * @throws {NotFoundError} When CV document doesn't exist
 * @throws {ValidationError} When parameters are invalid
 * @throws {ProcessingError} When CV is not yet processed
 * @example
 * ```typescript
 * try {
 *   const analysis = await analyzeSkillGap({
 *     cvDocumentId: 'cv-uuid',
 *     jobDescriptionText: 'Looking for senior developer with React and Node.js experience...',
 *     jobTitle: 'Senior Full Stack Developer',
 *     options: {
 *       prioritySkills: ['React', 'Node.js', 'TypeScript'],
 *       experienceLevel: 'senior'
 *     }
 *   });
 *   console.log('Analysis started:', analysis.sessionId);
 * } catch (error) {
 *   console.error('Analysis failed:', error.message);
 * }
 * ```
 */
export declare function analyzeSkillGap(params: {
  cvDocumentId: string;
  jobDescriptionText: string;
  jobTitle?: string;
  options?: {
    prioritySkills?: string[];
    experienceLevel?: 'junior' | 'mid' | 'senior' | 'lead';
  };
}): Promise<SkillGapAnalysisResponse>;

/**
 * Get skill gap analysis results
 * @function
 * @async
 * @param {string} sessionId - Analysis session UUID
 * @returns {Promise<SkillGapResultResponse>} Detailed skill gap analysis
 * @throws {NotFoundError} When analysis session doesn't exist
 * @throws {ProcessingError} When analysis is not yet completed
 * @example
 * ```typescript
 * try {
 *   const result = await getSkillGapResult('session-uuid');
 *   console.log('Missing skills:', result.missingSkills);
 *   console.log('Learning plan:', result.learningPlan);
 * } catch (error) {
 *   console.error('Failed to get skill gap result:', error.message);
 * }
 * ```
 */
export declare function getSkillGapResult(sessionId: string): Promise<SkillGapResultResponse>;

/**
 * Update skill learning status
 * @function
 * @async
 * @param {Object} params - Update parameters
 * @param {string} params.sessionId - Analysis session UUID
 * @param {string} params.skillId - Skill identifier
 * @param {string} params.status - New status ('pending', 'in_progress', 'completed', 'not_interested')
 * @param {string} [params.notes] - Optional notes about the skill
 * @returns {Promise<SkillUpdateResponse>} Updated skill information
 * @throws {NotFoundError} When analysis session or skill doesn't exist
 * @throws {ValidationError} When status is invalid
 * @example
 * ```typescript
 * try {
 *   const updated = await updateSkillStatus({
 *     sessionId: 'session-uuid',
 *     skillId: 'react',
 *     status: 'in_progress',
 *     notes: 'Taking online course'
 *   });
 *   console.log('Skill status updated:', updated.status);
 * } catch (error) {
 *   console.error('Failed to update skill:', error.message);
 * }
 * ```
 */
export declare function updateSkillStatus(params: {
  sessionId: string;
  skillId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'not_interested';
  notes?: string;
}): Promise<SkillUpdateResponse>;

/**
 * ============================================================================
 * COVER LETTER API
 * ============================================================================
 */

/**
 * Cover letter generation and customization
 * @namespace CoverLetterAPI
 */

/**
 * Generate a cover letter
 * @function
 * @async
 * @param {Object} params - Generation parameters
 * @param {string} params.cvDocumentId - CV document UUID
 * @param {string} params.jobDescriptionText - Job description text
 * @param {string} params.jobTitle - Job title
 * @param {string} params.companyName - Company name
 * @param {Object} [params.options] - Generation options
 * @param {string} [params.options.tone='professional'] - Tone of the cover letter
 * @param {number} [params.options.length='medium'] - Length of the cover letter
 * @param {string[]} [params.options.highlightSkills] - Skills to emphasize
 * @returns {Promise<CoverLetterGenerationResponse>} Generation session information
 * @throws {NotFoundError} When CV document doesn't exist
 * @throws {ValidationError} When parameters are invalid
 * @throws {ProcessingError} When CV is not yet processed
 * @example
 * ```typescript
 * try {
 *   const generation = await generateCoverLetter({
 *     cvDocumentId: 'cv-uuid',
 *     jobDescriptionText: 'Looking for a talented frontend developer...',
 *     jobTitle: 'Senior Frontend Developer',
 *     companyName: 'Tech Corp',
 *     options: {
 *       tone: 'professional',
 *       length: 'medium',
 *       highlightSkills: ['React', 'TypeScript', 'Node.js']
 *     }
 *   });
 *   console.log('Cover letter generation started:', generation.sessionId);
 * } catch (error) {
 *   console.error('Generation failed:', error.message);
 * }
 * ```
 */
export declare function generateCoverLetter(params: {
  cvDocumentId: string;
  jobDescriptionText: string;
  jobTitle: string;
  companyName: string;
  options?: {
    tone?: 'professional' | 'casual' | 'enthusiastic' | 'formal';
    length?: 'short' | 'medium' | 'long';
    highlightSkills?: string[];
  };
}): Promise<CoverLetterGenerationResponse>;

/**
 * Get generated cover letter
 * @function
 * @async
 * @param {string} sessionId - Generation session UUID
 * @returns {Promise<CoverLetterResultResponse>} Generated cover letter content
 * @throws {NotFoundError} When generation session doesn't exist
 * @throws {ProcessingError} When generation is not yet completed
 * @example
 * ```typescript
 * try {
 *   const coverLetter = await getCoverLetterResult('session-uuid');
 *   console.log('Generated content:', coverLetter.content);
 *   console.log('Word count:', coverLetter.wordCount);
 * } catch (error) {
 *   console.error('Failed to get cover letter:', error.message);
 * }
 * ```
 */
export declare function getCoverLetterResult(sessionId: string): Promise<CoverLetterResultResponse>;

/**
 * ============================================================================
 * INTERVIEW PREPARATION API
 * ============================================================================
 */

/**
 * Interview preparation and practice questions
 * @namespace InterviewAPI
 */

/**
 * Generate interview preparation materials
 * @function
 * @async
 * @param {Object} params - Preparation parameters
 * @param {string} params.cvDocumentId - CV document UUID
 * @param {string} params.jobDescriptionText - Job description text
 * @param {string} params.jobTitle - Job title
 * @param {Object} [params.options] - Preparation options
 * @param {string[]} [params.options.focusAreas] - Areas to focus on
 * @param {number} [params.options.questionCount=10] - Number of questions to generate
 * @param {string} [params.options.difficulty='mixed'] - Difficulty level
 * @returns {Promise<InterviewPreparationResponse>} Preparation session information
 * @throws {NotFoundError} When CV document doesn't exist
 * @throws {ValidationError} When parameters are invalid
 * @throws {ProcessingError} When CV is not yet processed
 * @example
 * ```typescript
 * try {
 *   const preparation = await prepareInterview({
 *     cvDocumentId: 'cv-uuid',
 *     jobDescriptionText: 'Senior React developer position...',
 *     jobTitle: 'Senior React Developer',
 *     options: {
 *       focusAreas: ['technical', 'behavioral'],
 *       questionCount: 15,
 *       difficulty: 'senior'
 *     }
 *   });
 *   console.log('Interview preparation started:', preparation.sessionId);
 * } catch (error) {
 *   console.error('Preparation failed:', error.message);
 * }
 * ```
 */
export declare function prepareInterview(params: {
  cvDocumentId: string;
  jobDescriptionText: string;
  jobTitle: string;
  options?: {
    focusAreas?: string[];
    questionCount?: number;
    difficulty?: 'junior' | 'mid' | 'senior' | 'lead' | 'mixed';
  };
}): Promise<InterviewPreparationResponse>;

/**
 * Get interview preparation materials
 * @function
 * @async
 * @param {string} sessionId - Preparation session UUID
 * @returns {Promise<InterviewPreparationResultResponse>} Interview questions and tips
 * @throws {NotFoundError} When preparation session doesn't exist
 * @throws {ProcessingError} When preparation is not yet completed
 * @example
 * ```typescript
 * try {
 *   const materials = await getInterviewPreparationResult('session-uuid');
 *   console.log('Questions:', materials.questions);
 *   console.log('Tips:', materials.tips);
 * } catch (error) {
 *   console.error('Failed to get materials:', error.message);
 * }
 * ```
 */
export declare function getInterviewPreparationResult(sessionId: string): Promise<InterviewPreparationResultResponse>;

/**
 * ============================================================================
 * SEARCH API
 * ============================================================================
 */

/**
 * Document and content search functionality
 * @namespace SearchAPI
 */

/**
 * Search documents by content similarity
 * @function
 * @async
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query text
 * @param {string[]} [params.documentIds] - Specific documents to search within
 * @param {string} [params.contentType] - Filter by content type
 * @param {Object} [params.options] - Search options
 * @param {number} [params.options.limit=10] - Maximum number of results
 * @param {number} [params.options.threshold=0.7] - Similarity threshold (0-1)
 * @returns {Promise<DocumentSearchResponse>} Search results with similarity scores
 * @throws {ValidationError} When search parameters are invalid
 * @example
 * ```typescript
 * try {
 *   const results = await searchDocuments({
 *     query: 'React developer with TypeScript experience',
 *     documentIds: ['doc-1', 'doc-2'],
 *     options: {
 *       limit: 5,
 *       threshold: 0.8
 *     }
 *   });
 *   console.log(`Found ${results.results.length} similar documents`);
 * } catch (error) {
 *   console.error('Search failed:', error.message);
 * }
 * ```
 */
export declare function searchDocuments(params: {
  query: string;
  documentIds?: string[];
  contentType?: string;
  options?: {
    limit?: number;
    threshold?: number;
  };
}): Promise<DocumentSearchResponse>;

/**
 * ============================================================================
 * USER PROFILE API
 * ============================================================================
 */

/**
 * User profile and preferences management
 * @namespace UserProfileAPI
 */

/**
 * Get user profile information
 * @function
 * @async
 * @returns {Promise<UserProfileResponse>} User profile data
 * @example
 * ```typescript
 * try {
 *   const profile = await getUserProfile();
 *   console.log('User name:', profile.name);
 *   console.log('Preferences:', profile.preferences);
 * } catch (error) {
 *   console.error('Failed to get profile:', error.message);
 * }
 * ```
 */
export declare function getUserProfile(): Promise<UserProfileResponse>;

/**
 * Update user profile information
 * @function
 * @async
 * @param {Object} profileData - Profile data to update
 * @param {string} [profileData.firstName] - First name
 * @param {string} [profileData.lastName] - Last name
 * @param {string} [profileData.phone] - Phone number
 * @param {string} [profileData.location] - Location
 * @param {string} [profileData.bio] - Bio/description
 * @param {string} [profileData.website] - Personal website
 * @param {string} [profileData.linkedinUrl] - LinkedIn profile URL
 * @param {string} [profileData.githubUrl] - GitHub profile URL
 * @returns {Promise<UserProfileResponse>} Updated profile data
 * @throws {ValidationError} When profile data is invalid
 * @example
 * ```typescript
 * try {
 *   const updated = await updateUserProfile({
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     bio: 'Senior software developer with 5+ years experience',
 *     linkedinUrl: 'https://linkedin.com/in/johndoe'
 *   });
 *   console.log('Profile updated:', updated.firstName);
 * } catch (error) {
 *   console.error('Profile update failed:', error.message);
 * }
 * ```
 */
export declare function updateUserProfile(profileData: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  bio?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}): Promise<UserProfileResponse>;

/**
 * Update user preferences
 * @function
 * @async
 * @param {Object} preferences - Preference updates
 * @param {boolean} [preferences.emailNotifications] - Enable email notifications
 * @param {boolean} [preferences.marketingEmails] - Enable marketing emails
 * @param {string} [preferences.theme] - UI theme ('light', 'dark', 'system')
 * @param {string} [preferences.language] - Interface language
 * @returns {Promise<UserPreferencesResponse>} Updated preferences
 * @example
 * ```typescript
 * try {
 *   const updated = await updateUserPreferences({
 *     emailNotifications: true,
 *     theme: 'dark',
 *     language: 'en'
 *   });
 *   console.log('Preferences updated');
 * } catch (error) {
 *   console.error('Preference update failed:', error.message);
 * }
 * ```
 */
export declare function updateUserPreferences(preferences: {
  emailNotifications?: boolean;
  marketingEmails?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}): Promise<UserPreferencesResponse>;

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

/**
 * Authentication response
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
    createdAt: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
}

/**
 * Document upload response
 */
export interface DocumentUploadResponse {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentType: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  createdAt: string;
}

/**
 * Document details response
 */
export interface DocumentDetailsResponse {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentType: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  parsedContent?: {
    fullText: string;
    pageCount?: number;
    wordCount?: number;
    sections?: Record<string, string>;
  };
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

/**
 * Document list response
 */
export interface DocumentListResponse {
  documents: Array<{
    id: string;
    title: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * CV analysis response
 */
export interface CVAnalysisResponse {
  sessionId: string;
  documentId: string;
  analysisType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

/**
 * CV analysis result response
 */
export interface CVAnalysisResultResponse {
  sessionId: string;
  documentId: string;
  overallScore: number;
  sections: {
    contactInfo: { score: number; feedback: string[] };
    summary: { score: number; feedback: string[] };
    experience: { score: number; feedback: string[] };
    education: { score: number; feedback: string[] };
    skills: { score: number; feedback: string[] };
  };
  recommendations: Array<{
    type: 'improvement' | 'addition' | 'removal';
    priority: 'high' | 'medium' | 'low';
    description: string;
    example?: string;
  }>;
  industryComparison?: {
    score: number;
    benchmarks: Record<string, number>;
  };
  completedAt: string;
}

/**
 * Analysis status response
 */
export interface AnalysisStatusResponse {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progressPercentage: number;
  currentStep?: string;
  estimatedCompletion?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Skill gap analysis response
 */
export interface SkillGapAnalysisResponse {
  sessionId: string;
  cvDocumentId: string;
  jobTitle: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

/**
 * Skill gap result response
 */
export interface SkillGapResultResponse {
  sessionId: string;
  cvDocumentId: string;
  jobTitle: string;
  overallMatch: number;
  missingSkills: Array<{
    skill: string;
    importance: 'critical' | 'important' | 'nice_to_have';
    category: 'technical' | 'soft' | 'domain';
    learningResources: Array<{
      type: 'course' | 'book' | 'tutorial' | 'certification';
      title: string;
      url?: string;
      estimatedTime: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
    }>;
  }>;
  learningPlan: {
    shortTerm: Array<{ skill: string; timeline: string; resources: string[] }>;
    mediumTerm: Array<{ skill: string; timeline: string; resources: string[] }>;
    longTerm: Array<{ skill: string; timeline: string; resources: string[] }>;
  };
  strengths: Array<{
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    evidence: string[];
  }>;
  completedAt: string;
}

/**
 * Skill update response
 */
export interface SkillUpdateResponse {
  sessionId: string;
  skillId: string;
  status: string;
  notes?: string;
  updatedAt: string;
}

/**
 * Cover letter generation response
 */
export interface CoverLetterGenerationResponse {
  sessionId: string;
  cvDocumentId: string;
  jobTitle: string;
  companyName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

/**
 * Cover letter result response
 */
export interface CoverLetterResultResponse {
  sessionId: string;
  content: string;
  wordCount: number;
  tone: string;
  highlights: string[];
  suggestions: string[];
  completedAt: string;
}

/**
 * Interview preparation response
 */
export interface InterviewPreparationResponse {
  sessionId: string;
  cvDocumentId: string;
  jobTitle: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

/**
 * Interview preparation result response
 */
export interface InterviewPreparationResultResponse {
  sessionId: string;
  questions: Array<{
    id: string;
    question: string;
    type: 'technical' | 'behavioral' | 'situational';
    difficulty: 'junior' | 'mid' | 'senior' | 'lead';
    suggestedAnswer?: string;
    tips: string[];
  }>;
  tips: Array<{
    category: string;
    advice: string[];
  }>;
  preparationChecklist: Array<{
    area: string;
    tasks: string[];
    completed: boolean;
  }>;
  completedAt: string;
}

/**
 * Document search response
 */
export interface DocumentSearchResponse {
  query: string;
  results: Array<{
    documentId: string;
    title: string;
    contentType: string;
    similarity: number;
    relevantSections: string[];
  }>;
  total: number;
  searchTime: number;
}

/**
 * User profile response
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  bio?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  avatarUrl?: string;
  preferences: {
    emailNotifications: boolean;
    marketingEmails: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * User preferences response
 */
export interface UserPreferencesResponse {
  emailNotifications: boolean;
  marketingEmails: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  updatedAt: string;
}

/**
 * Error types
 */
export interface ValidationError extends Error {
  code: 'VALIDATION_ERROR';
  field?: string;
  value?: any;
}

export interface AuthenticationError extends Error {
  code: 'AUTHENTICATION_ERROR';
}

export interface AuthorizationError extends Error {
  code: 'AUTHORIZATION_ERROR';
}

export interface NotFoundError extends Error {
  code: 'NOT_FOUND';
  resource: string;
}

export interface ConflictError extends Error {
  code: 'CONFLICT';
  resource: string;
}

export interface RateLimitError extends Error {
  code: 'RATE_LIMIT_ERROR';
  retryAfter?: number;
}

export interface ProcessingError extends Error {
  code: 'PROCESSING_ERROR';
  step?: string;
}

export interface StorageError extends Error {
  code: 'STORAGE_ERROR';
  operation: string;
}
