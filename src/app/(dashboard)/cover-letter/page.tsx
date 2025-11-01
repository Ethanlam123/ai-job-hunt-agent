import { CoverLetterClient } from '@/components/cover-letter/CoverLetterClient'

export default function CoverLetterPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Cover Letter Generator</h1>
          <p className="text-muted-foreground">
            Upload your CV and paste a job description to generate a personalized cover letter
          </p>
        </div>
        <CoverLetterClient />
      </div>
    </div>
  )
}
