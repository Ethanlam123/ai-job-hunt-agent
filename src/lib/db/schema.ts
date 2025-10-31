import { pgTable, uuid, varchar, text, timestamp, jsonb, vector } from 'drizzle-orm/pg-core'

// Users table (managed by Supabase Auth, defined here for relationships)
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Sessions table - tracks user workflow sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentStage: varchar('current_stage', { length: 50 }),
  state: jsonb('state'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
})

// Messages table - chat messages with agent responses
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Documents table - uploaded CVs and JDs
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  documentType: varchar('document_type', { length: 50 }), // 'cv' | 'jd' | 'cover_letter'
  originalFilename: varchar('original_filename', { length: 255 }),
  filePath: varchar('file_path', { length: 500 }),
  fileFormat: varchar('file_format', { length: 10 }), // 'pdf' | 'docx' | 'txt'
  parsedContent: jsonb('parsed_content'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// CV Embeddings table - vector embeddings for CV sections
export const cvEmbeddings = pgTable('cv_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  sectionType: varchar('section_type', { length: 50 }), // 'experience' | 'education' | 'skills' | etc.
  content: text('content'),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Job Descriptions table
export const jobDescriptions = pgTable('job_descriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 255 }),
  company: varchar('company', { length: 255 }),
  description: text('description'),
  requirements: jsonb('requirements'),
  parsedContent: jsonb('parsed_content'),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Tasks table - background job tracking
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  taskType: varchar('task_type', { length: 50 }).notNull(), // 'cv_analysis' | 'cover_letter' | etc.
  status: varchar('status', { length: 20 }).notNull(), // 'processing' | 'completed' | 'failed'
  result: jsonb('result'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
})

// Cache table - PostgreSQL-based caching
export const cache = pgTable('cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 255 }).unique().notNull(),
  value: jsonb('value').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Rate limits table - PostgreSQL-based rate limiting
export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Approvals table - tracks CV change approvals (human-in-the-loop)
export const approvals = pgTable('approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  changeType: varchar('change_type', { length: 50 }).notNull(), // 'cv_edit' | 'section_add' | etc.
  originalContent: jsonb('original_content'),
  proposedContent: jsonb('proposed_content'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  userFeedback: text('user_feedback'),
  createdAt: timestamp('created_at').defaultNow(),
  decidedAt: timestamp('decided_at'),
})

// Skill gaps table - identifies missing skills from CV vs JD comparison
export const skillGaps = pgTable('skill_gaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  skillName: varchar('skill_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }), // 'technical' | 'soft' | etc.
  importance: varchar('importance', { length: 20 }), // 'critical' | 'important' | 'nice-to-have'
  learningResources: jsonb('learning_resources'),
  createdAt: timestamp('created_at').defaultNow(),
})

// User metrics table - tracks usage statistics
export const userMetrics = pgTable('user_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // 'cv_analysis' | 'interview_count' | etc.
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// LLM calls table - tracks LLM API usage for monitoring and cost control
export const llmCalls = pgTable('llm_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
  model: varchar('model', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'openrouter' | 'openai'
  promptTokens: varchar('prompt_tokens', { length: 20 }),
  completionTokens: varchar('completion_tokens', { length: 20 }),
  totalTokens: varchar('total_tokens', { length: 20 }),
  cost: jsonb('cost'), // { amount: number, currency: string }
  duration: varchar('duration', { length: 20 }), // milliseconds
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Interview questions table - stores generated interview questions
export const interviewQuestions = pgTable('interview_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  category: varchar('category', { length: 100 }), // 'technical' | 'behavioral' | etc.
  difficulty: varchar('difficulty', { length: 20 }), // 'easy' | 'medium' | 'hard'
  suggestedAnswer: text('suggested_answer'),
  userAnswer: text('user_answer'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Cover letters table - stores generated cover letters
export const coverLetters = pgTable('cover_letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  cvDocumentId: uuid('cv_document_id').references(() => documents.id, { onDelete: 'set null' }),
  jdDocumentId: uuid('jd_document_id').references(() => documents.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  version: varchar('version', { length: 10 }).notNull().default('1'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Export TypeScript types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type CvEmbedding = typeof cvEmbeddings.$inferSelect
export type NewCvEmbedding = typeof cvEmbeddings.$inferInsert
export type JobDescription = typeof jobDescriptions.$inferSelect
export type NewJobDescription = typeof jobDescriptions.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type Cache = typeof cache.$inferSelect
export type NewCache = typeof cache.$inferInsert
export type RateLimit = typeof rateLimits.$inferSelect
export type NewRateLimit = typeof rateLimits.$inferInsert
export type Approval = typeof approvals.$inferSelect
export type NewApproval = typeof approvals.$inferInsert
export type SkillGap = typeof skillGaps.$inferSelect
export type NewSkillGap = typeof skillGaps.$inferInsert
export type UserMetric = typeof userMetrics.$inferSelect
export type NewUserMetric = typeof userMetrics.$inferInsert
export type LlmCall = typeof llmCalls.$inferSelect
export type NewLlmCall = typeof llmCalls.$inferInsert
export type InterviewQuestion = typeof interviewQuestions.$inferSelect
export type NewInterviewQuestion = typeof interviewQuestions.$inferInsert
export type CoverLetter = typeof coverLetters.$inferSelect
export type NewCoverLetter = typeof coverLetters.$inferInsert
