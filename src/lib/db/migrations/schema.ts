import { pgTable, foreignKey, pgPolicy, uuid, text, varchar, jsonb, timestamp, unique, vector, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const coverLetters = pgTable("cover_letters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	userId: uuid("user_id").notNull(),
	cvDocumentId: uuid("cv_document_id"),
	jdDocumentId: uuid("jd_document_id"),
	content: text().notNull(),
	version: varchar({ length: 10 }).default('1').notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.cvDocumentId],
			foreignColumns: [documents.id],
			name: "cover_letters_cv_document_id_documents_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.jdDocumentId],
			foreignColumns: [documents.id],
			name: "cover_letters_jd_document_id_documents_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "cover_letters_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cover_letters_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own cover letters", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own cover letters", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own cover letters", { as: "permissive", for: "update", to: ["public"] }),
]);

export const cache = pgTable("cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: varchar({ length: 255 }).notNull(),
	value: jsonb().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("cache_key_unique").on(table.key),
	pgPolicy("Users can view own cache", { as: "permissive", for: "select", to: ["public"], using: sql`(((key)::text ~~ 'public:%'::text) OR ((key)::text ~~ (('user:'::text || (auth.uid())::text) || ':%'::text)))` }),
	pgPolicy("Users can insert own cache", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own cache", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete own cache", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const approvals = pgTable("approvals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	userId: uuid("user_id").notNull(),
	documentId: uuid("document_id"),
	changeType: varchar("change_type", { length: 50 }).notNull(),
	originalContent: jsonb("original_content"),
	proposedContent: jsonb("proposed_content"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	userFeedback: text("user_feedback"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	decidedAt: timestamp("decided_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "approvals_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "approvals_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "approvals_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own approvals", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own approvals", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own approvals", { as: "permissive", for: "update", to: ["public"] }),
]);

export const cvEmbeddings = pgTable("cv_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	userId: uuid("user_id").notNull(),
	sectionType: varchar("section_type", { length: 50 }),
	content: text(),
	embedding: vector({ dimensions: 1536 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "cv_embeddings_document_id_documents_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own cv embeddings", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own cv embeddings", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const jobDescriptions = pgTable("job_descriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	userId: uuid("user_id").notNull(),
	title: varchar({ length: 255 }),
	company: varchar({ length: 255 }),
	description: text(),
	requirements: jsonb(),
	parsedContent: jsonb("parsed_content"),
	embedding: vector({ dimensions: 1536 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "job_descriptions_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own job descriptions", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own job descriptions", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "messages_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own messages", { as: "permissive", for: "select", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = messages.session_id) AND (sessions.user_id = auth.uid()))))` }),
	pgPolicy("Users can insert own messages", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const llmCalls = pgTable("llm_calls", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	sessionId: uuid("session_id"),
	model: varchar({ length: 100 }).notNull(),
	provider: varchar({ length: 50 }).notNull(),
	promptTokens: varchar("prompt_tokens", { length: 20 }),
	completionTokens: varchar("completion_tokens", { length: 20 }),
	totalTokens: varchar("total_tokens", { length: 20 }),
	cost: jsonb(),
	duration: varchar({ length: 20 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "llm_calls_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "llm_calls_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own llm calls", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own llm calls", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const rateLimits = pgTable("rate_limits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	identifier: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Users can manage rate limits", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() IS NOT NULL)` }),
]);

export const skillGaps = pgTable("skill_gaps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	userId: uuid("user_id").notNull(),
	skillName: varchar("skill_name", { length: 255 }).notNull(),
	category: varchar({ length: 100 }),
	importance: varchar({ length: 20 }),
	learningResources: jsonb("learning_resources"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "skill_gaps_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "skill_gaps_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own skill gaps", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own skill gaps", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	userId: uuid("user_id").notNull(),
	taskType: varchar("task_type", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	result: jsonb(),
	errorMessage: text("error_message"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "tasks_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tasks_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own tasks", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own tasks", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own tasks", { as: "permissive", for: "update", to: ["public"] }),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	currentStage: varchar("current_stage", { length: 50 }),
	state: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own sessions", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own sessions", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own sessions", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete own sessions", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const userMetrics = pgTable("user_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	metricType: varchar("metric_type", { length: 50 }).notNull(),
	value: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_metrics_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own metrics", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own metrics", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sessionId: uuid("session_id"),
	documentType: varchar("document_type", { length: 50 }),
	originalFilename: varchar("original_filename", { length: 255 }),
	filePath: varchar("file_path", { length: 500 }),
	fileFormat: varchar("file_format", { length: 10 }),
	parsedContent: jsonb("parsed_content"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "documents_session_id_sessions_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own documents", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own documents", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own documents", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can delete own documents", { as: "permissive", for: "delete", to: ["public"] }),
]);

export const interviewQuestions = pgTable("interview_questions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	userId: uuid("user_id").notNull(),
	difficulty: varchar({ length: 20 }).notNull(),
	userAnswer: text("user_answer"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	documentId: uuid("document_id"),
	jobDescriptionId: uuid("job_description_id"),
	questionType: varchar("question_type", { length: 50 }).notNull(),
	questionText: text("question_text").notNull(),
	expectedAnswer: text("expected_answer"),
	evaluationCriteria: jsonb("evaluation_criteria"),
	orderIndex: integer("order_index").default(0).notNull(),
	evaluationResult: jsonb("evaluation_result"),
	answeredAt: timestamp("answered_at", { mode: 'string' }),
	metadata: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "interview_questions_document_id_documents_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.jobDescriptionId],
			foreignColumns: [documents.id],
			name: "interview_questions_job_description_id_documents_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "interview_questions_session_id_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "interview_questions_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("Users can view own interview questions", { as: "permissive", for: "select", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can insert own interview questions", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can update own interview questions", { as: "permissive", for: "update", to: ["public"] }),
]);
