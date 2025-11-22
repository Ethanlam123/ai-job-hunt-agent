import { SessionDocument, SessionWithDetails, SessionSummary } from '@/lib/services/session-data-service'

// Re-export types from service for convenience
export type {
  SessionDocument,
  SessionWithDetails,
  SessionSummary
}

// Additional component-specific types
export interface SessionCardProps {
  session: SessionSummary
  onClick: (sessionId: string) => void
  className?: string
}

export interface EmptyStateProps {
  onNavigateToDashboard?: () => void
  className?: string
}

export interface SessionDetailsProps {
  sessionId: string
  onBack: () => void
  className?: string
}

export interface HistoryPageClientProps {
  initialSessions: SessionSummary[]
}