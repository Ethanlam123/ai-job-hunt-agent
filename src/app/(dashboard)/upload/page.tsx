import { FileUploader } from '@/components/upload/file-uploader'

export default function UploadTestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">File Upload Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the file upload functionality
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FileUploader documentType="cv" />
        <FileUploader documentType="jd" />
      </div>
    </div>
  )
}
