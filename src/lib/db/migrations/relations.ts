import { relations } from 'drizzle-orm/relations'
import { documents, coverLetters, sessions, users, approvals, cvEmbeddings, jobDescriptions, messages, llmCalls, skillGaps, tasks, userMetrics, interviewQuestions } from './schema'

export const coverLettersRelations = relations(coverLetters, ({one}) => ({
	document_cvDocumentId: one(documents, {
		fields: [coverLetters.cvDocumentId],
		references: [documents.id],
		relationName: 'coverLetters_cvDocumentId_documents_id',
	}),
	document_jdDocumentId: one(documents, {
		fields: [coverLetters.jdDocumentId],
		references: [documents.id],
		relationName: 'coverLetters_jdDocumentId_documents_id',
	}),
	session: one(sessions, {
		fields: [coverLetters.sessionId],
		references: [sessions.id],
	}),
	user: one(users, {
		fields: [coverLetters.userId],
		references: [users.id],
	}),
}))

export const documentsRelations = relations(documents, ({one, many}) => ({
	coverLetters_cvDocumentId: many(coverLetters, {
		relationName: 'coverLetters_cvDocumentId_documents_id',
	}),
	coverLetters_jdDocumentId: many(coverLetters, {
		relationName: 'coverLetters_jdDocumentId_documents_id',
	}),
	approvals: many(approvals),
	cvEmbeddings: many(cvEmbeddings),
	session: one(sessions, {
		fields: [documents.sessionId],
		references: [sessions.id],
	}),
	user: one(users, {
		fields: [documents.userId],
		references: [users.id],
	}),
	interviewQuestions_documentId: many(interviewQuestions, {
		relationName: 'interviewQuestions_documentId_documents_id',
	}),
	interviewQuestions_jobDescriptionId: many(interviewQuestions, {
		relationName: 'interviewQuestions_jobDescriptionId_documents_id',
	}),
}))

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	coverLetters: many(coverLetters),
	approvals: many(approvals),
	jobDescriptions: many(jobDescriptions),
	messages: many(messages),
	llmCalls: many(llmCalls),
	skillGaps: many(skillGaps),
	tasks: many(tasks),
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
	documents: many(documents),
	interviewQuestions: many(interviewQuestions),
}))

export const usersRelations = relations(users, ({many}) => ({
	coverLetters: many(coverLetters),
	approvals: many(approvals),
	llmCalls: many(llmCalls),
	skillGaps: many(skillGaps),
	tasks: many(tasks),
	sessions: many(sessions),
	userMetrics: many(userMetrics),
	documents: many(documents),
	interviewQuestions: many(interviewQuestions),
}))

export const approvalsRelations = relations(approvals, ({one}) => ({
	document: one(documents, {
		fields: [approvals.documentId],
		references: [documents.id],
	}),
	session: one(sessions, {
		fields: [approvals.sessionId],
		references: [sessions.id],
	}),
	user: one(users, {
		fields: [approvals.userId],
		references: [users.id],
	}),
}))

export const cvEmbeddingsRelations = relations(cvEmbeddings, ({one}) => ({
	document: one(documents, {
		fields: [cvEmbeddings.documentId],
		references: [documents.id],
	}),
}))

export const jobDescriptionsRelations = relations(jobDescriptions, ({one}) => ({
	session: one(sessions, {
		fields: [jobDescriptions.sessionId],
		references: [sessions.id],
	}),
}))

export const messagesRelations = relations(messages, ({one}) => ({
	session: one(sessions, {
		fields: [messages.sessionId],
		references: [sessions.id],
	}),
}))

export const llmCallsRelations = relations(llmCalls, ({one}) => ({
	session: one(sessions, {
		fields: [llmCalls.sessionId],
		references: [sessions.id],
	}),
	user: one(users, {
		fields: [llmCalls.userId],
		references: [users.id],
	}),
}))

export const skillGapsRelations = relations(skillGaps, ({one}) => ({
	session: one(sessions, {
		fields: [skillGaps.sessionId],
		references: [sessions.id],
	}),
	user: one(users, {
		fields: [skillGaps.userId],
		references: [users.id],
	}),
}))

export const tasksRelations = relations(tasks, ({one}) => ({
	session: one(sessions, {
		fields: [tasks.sessionId],
		references: [sessions.id],
	}),
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id],
	}),
}))

export const userMetricsRelations = relations(userMetrics, ({one}) => ({
	user: one(users, {
		fields: [userMetrics.userId],
		references: [users.id],
	}),
}))

export const interviewQuestionsRelations = relations(interviewQuestions, ({one}) => ({
	document_documentId: one(documents, {
		fields: [interviewQuestions.documentId],
		references: [documents.id],
		relationName: 'interviewQuestions_documentId_documents_id',
	}),
	document_jobDescriptionId: one(documents, {
		fields: [interviewQuestions.jobDescriptionId],
		references: [documents.id],
		relationName: 'interviewQuestions_jobDescriptionId_documents_id',
	}),
	session: one(sessions, {
		fields: [interviewQuestions.sessionId],
		references: [sessions.id],
	}),
	user: one(users, {
		fields: [interviewQuestions.userId],
		references: [users.id],
	}),
}))
