import { createClient } from '@/lib/supabase/server'
import { getUserSessions, createSessionSummary } from '@/lib/services/session-data-service'
import { HistoryClient } from './history-client'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  try {
    // Fetch initial sessions data on the server
    const { sessions } = await getUserSessions(user.id, 20, 0)

    // Convert sessions to summary format
    const sessionSummaries = sessions.map(session => {
      // The getUserSessions function already returns processed sessions with correct structure
      // We just need to create the summary format
      const cvDocument = session.documents.find(doc => doc.documentType === 'cv')
      const jdDocument = session.documents.find(doc => doc.documentType === 'jd')

      // Determine session status
      let status: 'completed' | 'processing' | 'failed' = 'processing'
      if (session.completedAt) {
        status = 'completed'
      } else if (session.state?.error) {
        status = 'failed'
      }

      // Create display name for analysis type
      const stageDisplay = session.currentStage?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown'

      // Create result summary
      let resultSummary = 'Analysis completed'
      if (session.resultCounts) {
        if (session.currentStage === 'skill_gap' || session.currentStage === 'skill-gap') {
          resultSummary = `${session.resultCounts.skillGaps} skills identified for development`
        } else if (session.currentStage === 'interview_preparation') {
          resultSummary = `${session.resultCounts.interviewQuestions} practice questions generated`
        } else if (session.currentStage === 'generating_cover_letter') {
          resultSummary = session.resultCounts.coverLetters > 0 ? 'Cover letter generated successfully' : 'Cover letter generation in progress'
        }
      }

      return {
        id: session.id,
        analysisType: session.analysisType || 'general',
        stageDisplay,
        createdAt: session.createdAt,
        status,
        cvDocument,
        jdDocument,
        resultSummary
      }
    })

    return <HistoryClient initialSessions={sessionSummaries} />
  } catch (error) {
    console.error('Error fetching history data:', error)
    // Return client component with empty sessions on error
    return <HistoryClient initialSessions={[]} />
  }
}