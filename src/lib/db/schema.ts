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
