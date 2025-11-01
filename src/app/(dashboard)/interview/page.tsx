import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { InterviewPracticeClient } from "@/components/interview/interview-practice-client"

export const metadata: Metadata = {
  title: "Interview Preparation | AI Job Hunt Agent",
  description: "Practice interviews with AI-generated questions and feedback",
}

export default async function InterviewPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user's CV documents
  const { data: cvDocuments } = await supabase
    .from('documents')
    .select('id, original_filename, created_at')
    .eq('user_id', user.id)
    .eq('document_type', 'cv')
    .order('created_at', { ascending: false })

  // Fetch user's job description documents
  const { data: jdDocuments } = await supabase
    .from('documents')
    .select('id, original_filename, created_at')
    .eq('user_id', user.id)
    .eq('document_type', 'job_description')
    .order('created_at', { ascending: false })

  const cvDocs = cvDocuments || []
  const jdDocs = jdDocuments || []

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Interview Preparation</h1>
          <p className="text-muted-foreground">
            Practice your interview skills with AI-generated questions tailored to your CV and job description
          </p>
        </div>

        {cvDocs.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Setup Required</h3>
            <p className="text-yellow-800 mb-4">
              To start interview preparation, you need to upload at least one CV document.
            </p>
            <p className="text-yellow-800 mt-4">
              Please visit the <a href="/documents" className="underline font-medium">Documents</a> page to upload your CV.
            </p>
            <p className="text-yellow-800 mt-2 text-sm">
              Note: You can paste the job description text directly in the interview setup.
            </p>
          </div>
        ) : (
          <InterviewPracticeClient cvDocuments={cvDocs} jdDocuments={jdDocs} />
        )}
      </div>
    </div>
  )
}
