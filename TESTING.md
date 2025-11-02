# Testing Guide - AI Job Hunt Agent

This document outlines the testing workflow for the AI Job Hunt Agent application.

## Prerequisites

- Dev server running on `http://localhost:3000` (or another port if 3000 is occupied)
- Valid Supabase connection
- OpenRouter API key configured
- OpenAI API key configured

## Testing Workflow

### 1. Document Management ✅

**What was fixed:**
- ✅ Document upload now automatically parses content using `DocumentParser`
- ✅ All document types (PDF, DOCX, TXT) are supported
- ✅ Parsed content includes `fullText`, `pageCount`, `wordCount`, and `sections`

**Test Steps:**
1. Navigate to http://localhost:3000/documents
2. Upload a test CV (PDF format recommended)
3. Verify:
   - File uploads successfully
   - Document appears in the list
   - File metadata (size, type, date) is displayed correctly
4. Try uploading different file types (PDF, DOCX, TXT)
5. Test document deletion

**Expected Results:**
- Documents are uploaded and parsed automatically
- All file types are accepted (PDF, DOCX, TXT)
- Documents appear immediately in the list
- Deletion removes the document from storage and database

---

### 2. CV Analysis ✅

**What was fixed:**
- ✅ CV Analysis now supports both "existing document" and "upload new" workflows
- ✅ `uploadAndAnalyzeCV` action accepts optional `documentId` parameter
- ✅ When using existing document, no duplicate upload occurs

**Test Steps:**

#### A. Using Existing CV
1. Navigate to http://localhost:3000/cv-analysis
2. Select the "Use Existing CV" tab
3. Choose a previously uploaded CV from the dropdown
4. Click "Analyze CV"
5. Wait for analysis to complete

**Expected Results:**
- Document selector shows uploaded CVs
- Analysis runs without re-uploading the file
- Results show:
  - Overall score
  - Strengths and weaknesses
  - Specific improvements with priority levels
- Approval workflow allows accepting/rejecting improvements

#### B. Upload New CV
1. Select the "Upload New CV" tab
2. Choose a PDF file from your computer
3. Click "Analyze CV"
4. Wait for analysis to complete

**Expected Results:**
- File uploads and analysis runs in one step
- Same results as above
- New document appears in /documents page

---

### 3. Cover Letter Generation ✅

**What was fixed:**
- ✅ Cover Letter generation supports existing documents via `documentId` parameter
- ✅ Validates document ownership before use
- ✅ Reduces duplicate CV uploads

**Test Steps:**

#### A. Using Existing CV
1. Navigate to http://localhost:3000/cover-letter
2. Select the "Use Existing CV" tab
3. Choose a previously uploaded CV
4. Fill in:
   - Job Description (paste full JD text)
   - Company Name
   - Position Title
   - Hiring Manager Name (optional)
5. Click "Generate Cover Letter"

**Expected Results:**
- Cover letter is generated based on CV and JD
- Letter is personalized with company name and position
- Letter structure includes:
  - Greeting (with hiring manager name if provided)
  - Opening paragraph
  - Body paragraphs highlighting relevant skills
  - Closing paragraph
  - Professional sign-off
- Generated cover letter is saved to database

#### B. Upload New CV
1. Select the "Upload New CV" tab
2. Upload a PDF file
3. Fill in job details
4. Click "Generate Cover Letter"

**Expected Results:**
- Same as above, with CV uploaded and analyzed in one step

---

### 4. Interview Preparation ✅

**What was fixed:**
- ✅ Already supports document IDs (`cvDocumentId` and `jdDocumentId`)
- ✅ Supports both document upload and text input for JD
- ✅ No changes needed - already properly implemented

**Test Steps:**

#### A. Question Generation
1. Navigate to http://localhost:3000/interview
2. Select an existing CV from the dropdown
3. Either:
   - Upload a JD document, OR
   - Paste JD text directly
4. Choose difficulty level (Beginner, Intermediate, Advanced)
5. Choose number of questions (default: 10)
6. Click "Generate Questions"

**Expected Results:**
- Questions are generated based on CV skills and JD requirements
- Questions include:
  - Question type (behavioral, technical, situational)
  - Difficulty level
  - Expected answer criteria
  - Evaluation criteria
- Questions appear in order

#### B. Answer & Evaluate
1. For each question, type your answer in the text area
2. Click "Submit Answer"
3. Wait for evaluation

**Expected Results:**
- Answer is evaluated by AI
- Evaluation includes:
  - Score (1-10)
  - Strengths identified
  - Weaknesses identified
  - Missing points
  - Improvement suggestions
- Can navigate to next question
- Progress is saved

#### C. Performance Analysis
1. After answering all questions (or at least a few)
2. Click "View Performance Analysis"

**Expected Results:**
- Overall score calculated
- Category breakdown (technical, behavioral, etc.)
- Strength areas identified
- Areas for improvement highlighted
- Preparation tips provided

---

## Code Changes Summary

### Files Modified:

1. **src/actions/documents.ts**
   - Added `DocumentParser` integration
   - Documents are now parsed automatically on upload
   - Parsed content stored in `parsed_content` field

2. **src/actions/cv.ts**
   - `uploadAndAnalyzeCV` now accepts `documentId` parameter
   - Supports both new uploads and existing documents
   - Avoids duplicate document uploads

3. **src/actions/cover-letter.ts**
   - `generateCoverLetter` now accepts `documentId` parameter
   - Validates document ownership
   - Reduces duplicate uploads

4. **src/actions/interview.ts**
   - Already properly implemented with document ID support
   - No changes needed

### Commits:

```
624271e feat: Integrate DocumentParser into upload action for automatic content parsing
5875e10 feat: Support existing document ID in uploadAndAnalyzeCV action
3615d80 feat: Support existing document ID in cover letter generation
```

---

## Testing Checklist

- [ ] Document Management
  - [ ] Upload PDF
  - [ ] Upload DOCX
  - [ ] Upload TXT
  - [ ] View uploaded documents
  - [ ] Delete document

- [ ] CV Analysis
  - [ ] Use existing CV for analysis
  - [ ] Upload new CV for analysis
  - [ ] Verify LLM analysis works
  - [ ] Test approval workflow
  - [ ] Check improvements are saved

- [ ] Cover Letter
  - [ ] Use existing CV
  - [ ] Upload new CV
  - [ ] Generate with all fields
  - [ ] Generate without hiring manager name
  - [ ] Verify personalization

- [ ] Interview Prep
  - [ ] Generate questions from CV + JD document
  - [ ] Generate questions from CV + JD text
  - [ ] Answer questions
  - [ ] Get evaluations
  - [ ] View performance analysis

- [ ] Dashboard
  - [ ] Verify stats are accurate
  - [ ] Check recent activity
  - [ ] Test navigation to features

---

## Known Limitations

1. **LLM API Costs**: Each analysis, cover letter, and interview evaluation calls OpenRouter API (costs apply)
2. **Parsing Quality**: PDF parsing quality depends on PDF structure (scanned PDFs may have poor results)
3. **Rate Limiting**: OpenRouter may have rate limits (configured in `.env`)
4. **Storage Costs**: Supabase Storage has usage limits on free tier

---

## Next Steps After Testing

1. **Manual Testing**: Test each workflow above manually
2. **Bug Fixes**: Fix any issues found during testing
3. **Performance Testing**: Check LLM response times
4. **Error Handling**: Verify error messages are user-friendly
5. **Deployment**: Once all tests pass, deploy to production (Vercel)

---

## Environment Variables to Verify

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>  # Only for admin operations
DATABASE_URL=<your-postgres-url>

# OpenRouter (LLM)
OPENROUTER_API_KEY=<your-key>

# OpenAI (Embeddings)
OPENAI_API_KEY=<your-key>

# LangSmith (Optional, for tracing)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=job-hunt-agent
LANGCHAIN_API_KEY=<your-key>
```

All keys should be configured in `.env` file.
