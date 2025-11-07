# Comprehensive Testing Guide

This guide provides detailed testing strategies and procedures for the AI Job Hunt Agent project, covering unit tests, integration tests, end-to-end testing, and quality assurance practices.

## Table of Contents

- [Testing Overview](#testing-overview)
- [Testing Tools and Setup](#testing-tools-and-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Accessibility Testing](#accessibility-testing)
- [Database Testing](#database-testing)
- [API Testing](#api-testing)
- [Manual Testing](#manual-testing)
- [Continuous Testing](#continuous-testing)
- [Test Coverage](#test-coverage)

## Testing Overview

### Testing Pyramid

```
        E2E Tests (10%)
       ─────────────────
      Integration Tests (20%)
     ─────────────────────────
    Unit Tests (70%)
   ──────────────────────────────
```

- **Unit Tests (70%)**: Fast, isolated tests for individual functions and components
- **Integration Tests (20%)**: Tests for component interactions and data flows
- **E2E Tests (10%)**: Complete user journey tests across the application

### Testing Goals

1. **Prevent regressions** with automated test suites
2. **Ensure functionality** works as expected
3. **Maintain code quality** through test-driven development
4. **Validate user experience** through comprehensive testing
5. **Catch security issues** through security-focused testing

## Testing Tools and Setup

### Testing Stack

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Vitest** | Unit testing framework | `vitest.config.ts` |
| **Testing Library** | Component testing | React Testing Library |
| **Playwright** | E2E testing | `playwright.config.ts` |
| **MSW** | API mocking | Mock Service Worker |
| **Test Containers** | Database testing | Docker containers |
| **Coverage** | Code coverage | `c8` or `nyc` |

### Configuration Files

#### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

#### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Start mock server
beforeAll(() => server.listen())

// Reset handlers after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Close server after all tests
afterAll(() => server.close())
```

## Unit Testing

### Service Testing

#### Document Parser Tests

```typescript
// src/lib/services/__tests__/document-parser.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DocumentParser } from '../document-parser'

describe('DocumentParser', () => {
  let parser: DocumentParser

  beforeEach(() => {
    parser = new DocumentParser()
  })

  describe('parseDocument', () => {
    it('should parse PDF content successfully', async () => {
      // Arrange
      const mockBuffer = Buffer.from('mock pdf content')
      const expectedText = 'Sample PDF content'

      // Act
      const result = await parser.parseDocument(mockBuffer, 'pdf')

      // Assert
      expect(result).toEqual({
        text: expect.any(String),
        documents: expect.any(Array),
        metadata: expect.objectContaining({
          pages: expect.any(Number),
          wordCount: expect.any(Number)
        })
      })
      expect(result.text).toContain('Sample')
    })

    it('should handle DOCX content correctly', async () => {
      // Arrange
      const mockBuffer = Buffer.from('mock docx content')

      // Act
      const result = await parser.parseDocument(mockBuffer, 'docx')

      // Assert
      expect(result.text).toBeDefined()
      expect(result.documents).toHaveLength(1)
    })

    it('should parse TXT content directly', async () => {
      // Arrange
      const content = 'This is a plain text document'
      const buffer = Buffer.from(content, 'utf-8')

      // Act
      const result = await parser.parseDocument(buffer, 'txt')

      // Assert
      expect(result.text).toBe(content)
      expect(result.metadata?.wordCount).toBe(7)
    })

    it('should throw error for unsupported file types', async () => {
      // Arrange
      const buffer = Buffer.from('content')

      // Act & Assert
      await expect(
        parser.parseDocument(buffer, 'unsupported')
      ).rejects.toThrow('Unsupported file type: unsupported')
    })

    it('should handle empty files', async () => {
      // Arrange
      const emptyBuffer = Buffer.alloc(0)

      // Act
      const result = await parser.parseDocument(emptyBuffer, 'txt')

      // Assert
      expect(result.text).toBe('')
      expect(result.documents).toHaveLength(0)
    })

    it('should handle corrupted files gracefully', async () => {
      // Arrange
      const corruptedBuffer = Buffer.from([0xFF, 0xFE, 0xFD])

      // Act & Assert
      await expect(
        parser.parseDocument(corruptedBuffer, 'pdf')
      ).rejects.toThrow()
    })
  })

  describe('extractMetadata', () => {
    it('should extract word count correctly', async () => {
      // Arrange
      const text = 'This is a test document with seven words'
      const buffer = Buffer.from(text, 'utf-8')

      // Act
      const result = await parser.parseDocument(buffer, 'txt')

      // Assert
      expect(result.metadata?.wordCount).toBe(7)
    })

    it('should detect document language', async () => {
      // Arrange
      const englishText = 'This is an English document'
      const buffer = Buffer.from(englishText, 'utf-8')

      // Act
      const result = await parser.parseDocument(buffer, 'txt')

      // Assert
      expect(result.metadata?.language).toBe('en')
    })
  })
})
```

#### LLM Service Tests

```typescript
// src/lib/services/__tests__/llm-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LLMService } from '../llm-service'

describe('LLMService', () => {
  let service: LLMService

  beforeEach(() => {
    service = new LLMService()
  })

  describe('generateAnalysis', () => {
    it('should generate CV analysis successfully', async () => {
      // Arrange
      const mockCV = {
        content: 'Software Engineer with 5 years experience',
        sections: ['experience', 'skills', 'education']
      }

      // Mock OpenAI response
      vi.spyOn(service['llm'], 'invoke').mockResolvedValue({
        content: JSON.stringify({
          score: 85,
          strengths: ['strong technical background'],
          improvements: ['add more quantifiable achievements']
        })
      })

      // Act
      const result = await service.generateAnalysis(mockCV, 'cv-analysis')

      // Assert
      expect(result).toEqual({
        score: 85,
        strengths: ['strong technical background'],
        improvements: ['add more quantifiable achievements']
      })
    })

    it('should handle API errors gracefully', async () => {
      // Arrange
      const mockCV = { content: 'test content' }
      const apiError = new Error('API rate limit exceeded')

      vi.spyOn(service['llm'], 'invoke').mockRejectedValue(apiError)

      // Act & Assert
      await expect(
        service.generateAnalysis(mockCV, 'cv-analysis')
      ).rejects.toThrow('API rate limit exceeded')
    })

    it('should retry on transient failures', async () => {
      // Arrange
      const mockCV = { content: 'test content' }

      vi.spyOn(service['llm'], 'invoke')
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          content: JSON.stringify({ score: 90 })
        })

      // Act
      const result = await service.generateAnalysis(mockCV, 'cv-analysis')

      // Assert
      expect(result.score).toBe(90)
      expect(service['llm'].invoke).toHaveBeenCalledTimes(2)
    })
  })
})
```

### Component Testing

#### Document Uploader Tests

```typescript
// src/components/documents/__tests__/document-uploader.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentUploader } from '../document-uploader'

describe('DocumentUploader', () => {
  const mockOnUpload = vi.fn()

  beforeEach(() => {
    mockOnUpload.mockClear()
  })

  it('should render upload interface correctly', () => {
    render(<DocumentUploader onUpload={mockOnUpload} />)

    expect(screen.getByText('Upload Document')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop your files here')).toBeInTheDocument()
    expect(screen.getByText('or click to browse')).toBeInTheDocument()
  })

  it('should show accepted file types', () => {
    render(
      <DocumentUploader
        onUpload={mockOnUpload}
        acceptedTypes={['.pdf', '.docx']}
      />
    )

    expect(screen.getByText(/PDF, DOCX/)).toBeInTheDocument()
  })

  it('should handle file selection', async () => {
    const user = userEvent.setup()
    render(<DocumentUploader onUpload={mockOnUpload} />)

    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf'
    })

    const dropzone = screen.getByTestId('dropzone')
    await user.upload(dropzone, file)

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file)
    })
  })

  it('should validate file type', async () => {
    const user = userEvent.setup()
    render(
      <DocumentUploader
        onUpload={mockOnUpload}
        acceptedTypes={['.pdf']}
      />
    )

    const invalidFile = new File(['test content'], 'test.txt', {
      type: 'text/plain'
    })

    const dropzone = screen.getByTestId('dropzone')
    await user.upload(dropzone, invalidFile)

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/)).toBeInTheDocument()
    })

    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('should validate file size', async () => {
    const user = userEvent.setup()
    render(
      <DocumentUploader
        onUpload={mockOnUpload}
        maxSize={1024} // 1KB
      />
    )

    const largeFile = new File(['a'.repeat(2048)], 'large.pdf', {
      type: 'application/pdf'
    })

    const dropzone = screen.getByTestId('dropzone')
    await user.upload(dropzone, largeFile)

    await waitFor(() => {
      expect(screen.getByText(/File too large/)).toBeInTheDocument()
    })

    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('should show loading state during upload', async () => {
    const user = userEvent.setup()
    mockOnUpload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(<DocumentUploader onUpload={mockOnUpload} />)

    const file = new File(['test content'], 'test.pdf')
    const dropzone = screen.getByTestId('dropzone')
    await user.upload(dropzone, file)

    expect(screen.getByText('Uploading...')).toBeInTheDocument()
  })

  it('should show success message after upload', async () => {
    const user = userEvent.setup()
    mockOnUpload.mockResolvedValue({ success: true })

    render(<DocumentUploader onUpload={mockOnUpload} />)

    const file = new File(['test content'], 'test.pdf')
    const dropzone = screen.getByTestId('dropzone')
    await user.upload(dropzone, file)

    await waitFor(() => {
      expect(screen.getByText(/Upload successful/)).toBeInTheDocument()
    })
  })

  it('should show error message on upload failure', async () => {
    const user = userEvent.setup()
    mockOnUpload.mockResolvedValue({ success: false, error: 'Upload failed' })

    render(<DocumentUploader onUpload={mockOnUpload} />)

    const file = new File(['test content'], 'test.pdf')
    const dropzone = screen.getByTestId('dropzone')
    await user.upload(dropzone, file)

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })
})
```

#### CV Analysis Tests

```typescript
// src/components/cv-analysis/__tests__/cv-analysis-client.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CVAnalysisClient } from '../cv-analysis-client'

// Mock server actions
vi.mock('@/actions/cv', () => ({
  analyzeCVAction: vi.fn(),
  getCVAnalysis: vi.fn()
}))

describe('CVAnalysisClient', () => {
  const mockDocument = {
    id: 'doc-123',
    filename: 'test-cv.pdf',
    uploadedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render analysis interface', () => {
    render(<CVAnalysisClient document={mockDocument} />)

    expect(screen.getByText('CV Analysis')).toBeInTheDocument()
    expect(screen.getByText('Start Analysis')).toBeInTheDocument()
  })

  it('should start analysis when button clicked', async () => {
    const user = userEvent.setup()
    const { analyzeCVAction } = await import('@/actions/cv')
    ;(analyzeCVAction as vi.Mock).mockResolvedValue({
      success: true,
      data: { taskId: 'task-123' }
    })

    render(<CVAnalysisClient document={mockDocument} />)

    const startButton = screen.getByText('Start Analysis')
    await user.click(startButton)

    await waitFor(() => {
      expect(analyzeCVAction).toHaveBeenCalledWith({
        documentId: 'doc-123',
        sessionId: expect.any(String)
      })
    })

    expect(screen.getByText('Analysis in progress...')).toBeInTheDocument()
  })

  it('should handle analysis failure', async () => {
    const user = userEvent.setup()
    const { analyzeCVAction } = await import('@/actions/cv')
    ;(analyzeCVAction as vi.Mock).mockResolvedValue({
      success: false,
      error: 'Analysis failed'
    })

    render(<CVAnalysisClient document={mockDocument} />)

    const startButton = screen.getByText('Start Analysis')
    await user.click(startButton)

    await waitFor(() => {
      expect(screen.getByText('Analysis failed')).toBeInTheDocument()
    })
  })

  it('should display analysis results', async () => {
    const user = userEvent.setup()
    const { analyzeCVAction, getCVAnalysis } = await import('@/actions/cv')

    ;(analyzeCVAction as vi.Mock).mockResolvedValue({
      success: true,
      data: { taskId: 'task-123' }
    })

    ;(getCVAnalysis as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        analysis: {
          score: 85,
          strengths: ['Strong technical skills'],
          improvements: ['Add quantifiable achievements']
        }
      }
    })

    render(<CVAnalysisClient document={mockDocument} />)

    const startButton = screen.getByText('Start Analysis')
    await user.click(startButton)

    await waitFor(() => {
      expect(screen.getByText('Analysis Score: 85')).toBeInTheDocument()
      expect(screen.getByText('Strong technical skills')).toBeInTheDocument()
      expect(screen.getByText('Add quantifiable achievements')).toBeInTheDocument()
    })
  })
})
```

## Integration Testing

### Server Action Integration Tests

```typescript
// src/actions/__tests__/cv-integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyzeCVAction, getCVAnalysis } from '../cv'

// Mock dependencies
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/agents/cv-agent')
vi.mock('@/lib/services/document-parser')

describe('CV Analysis Integration', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockDocument = {
    id: 'doc-123',
    user_id: 'user-123',
    original_filename: 'test.pdf',
    parsed_content: { text: 'Sample CV content' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete CV Analysis Flow', () => {
    it('should analyze CV from start to finish', async () => {
      // Arrange
      const mockSupabase = {
        auth: { getUser: vi.fn().ResolvedValue({ data: { user: mockUser } }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockDocument })
            })
          })
        })
      }

      const mockAgent = {
        analyzeCV: vi.fn().mockResolvedValue({
          analysis: { score: 85 },
          improvements: ['Add metrics']
        })
      }

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: () => mockSupabase
      }))

      vi.doMock('@/lib/agents/cv-agent', () => ({
        CVAgent: vi.fn().mockImplementation(() => mockAgent)
      }))

      // Act
      const result = await analyzeCVAction({
        documentId: 'doc-123',
        sessionId: 'session-123'
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockAgent.analyzeCV).toHaveBeenCalledWith('doc-123', 'session-123', 'user-123')
    })

    it('should handle document upload and analysis', async () => {
      // Arrange
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf'
      })

      const mockParser = {
        parseDocument: vi.fn().mockResolvedValue({
          text: 'Parsed PDF content',
          metadata: { pages: 2, wordCount: 150 }
        })
      }

      vi.doMock('@/lib/services/document-parser', () => ({
        DocumentParser: vi.fn().mockImplementation(() => mockParser)
      }))

      // Act
      const result = await analyzeCVAction({
        file: file,
        sessionId: 'session-123'
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockParser.parseDocument).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication failure', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Unauthorized')
          })
        }
      }

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: () => mockSupabase
      }))

      // Act
      const result = await analyzeCVAction({
        documentId: 'doc-123',
        sessionId: 'session-123'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle document not found', async () => {
      // Arrange
      const mockSupabase = {
        auth: { getUser: vi.fn().ResolvedValue({ data: { user: mockUser } }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null })
            })
          })
        })
      }

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: () => mockSupabase
      }))

      // Act
      const result = await analyzeCVAction({
        documentId: 'nonexistent',
        sessionId: 'session-123'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Document not found')
    })

    it('should handle AI service failure', async () => {
      // Arrange
      const mockSupabase = {
        auth: { getUser: vi.fn().ResolvedValue({ data: { user: mockUser } }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockDocument })
            })
          })
        })
      }

      const mockAgent = {
        analyzeCV: vi.fn().mockRejectedValue(new Error('AI service error'))
      }

      vi.doMock('@/lib/supabase/server', () => ({
        createClient: () => mockSupabase
      }))

      vi.doMock('@/lib/agents/cv-agent', () => ({
        CVAgent: vi.fn().mockImplementation(() => mockAgent)
      }))

      // Act
      const result = await analyzeCVAction({
        documentId: 'doc-123',
        sessionId: 'session-123'
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('AI service error')
    })
  })
})
```

### Database Integration Tests

```typescript
// src/lib/db/__tests__/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '../test-utils'
import { DocumentService } from '../../services/document-service'

describe('Database Integration Tests', () => {
  let documentService: DocumentService
  let testDb: any

  beforeAll(async () => {
    testDb = await setupTestDatabase()
    documentService = new DocumentService(testDb.supabase)
  })

  afterAll(async () => {
    await teardownTestDatabase(testDb)
  })

  beforeEach(async () => {
    await testDb.clearTables()
  })

  describe('Document Operations', () => {
    it('should create and retrieve documents', async () => {
      // Arrange
      const documentData = {
        userId: 'user-123',
        documentType: 'cv',
        originalFilename: 'test.pdf',
        filePath: '/uploads/test.pdf',
        fileFormat: 'pdf',
        parsedContent: { text: 'Test content' }
      }

      // Act
      const created = await documentService.createDocument(documentData)
      const retrieved = await documentService.getDocument(created.id, documentData.userId)

      // Assert
      expect(created.id).toBeDefined()
      expect(retrieved).toEqual(created)
      expect(retrieved.originalFilename).toBe('test.pdf')
    })

    it('should enforce user isolation', async () => {
      // Arrange
      const user1Doc = await documentService.createDocument({
        userId: 'user-1',
        documentType: 'cv',
        originalFilename: 'user1.pdf',
        filePath: '/uploads/user1.pdf',
        fileFormat: 'pdf'
      })

      const user2Doc = await documentService.createDocument({
        userId: 'user-2',
        documentType: 'cv',
        originalFilename: 'user2.pdf',
        filePath: '/uploads/user2.pdf',
        fileFormat: 'pdf'
      })

      // Act
      const user1Docs = await documentService.getUserDocuments('user-1')
      const user2Docs = await documentService.getUserDocuments('user-2')

      // Assert
      expect(user1Docs).toHaveLength(1)
      expect(user1Docs[0].id).toBe(user1Doc.id)
      expect(user2Docs).toHaveLength(1)
      expect(user2Docs[0].id).toBe(user2Doc.id)
    })

    it('should handle concurrent operations', async () => {
      // Arrange
      const documents = Array.from({ length: 10 }, (_, i) => ({
        userId: 'user-123',
        documentType: 'cv',
        originalFilename: `test-${i}.pdf`,
        filePath: `/uploads/test-${i}.pdf`,
        fileFormat: 'pdf'
      }))

      // Act
      const promises = documents.map(doc => documentService.createDocument(doc))
      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(10)
      expect(new Set(results.map(r => r.id)).size).toBe(10) // All unique IDs
    })
  })

  describe('Vector Operations', () => {
    it('should store and retrieve embeddings', async () => {
      // Arrange
      const embedding = Array.from({ length: 1536 }, () => Math.random())
      const documentId = 'doc-123'
      const userId = 'user-123'

      // Act
      await documentService.storeEmbedding({
        documentId,
        userId,
        sectionType: 'experience',
        content: 'Software Engineer experience',
        embedding
      })

      const retrieved = await documentService.getEmbeddings(documentId, userId)

      // Assert
      expect(retrieved).toHaveLength(1)
      expect(retrieved[0].content).toBe('Software Engineer experience')
      expect(retrieved[0].embedding).toEqual(embedding)
    })

    it('should perform similarity search', async () => {
      // Arrange
      const queryEmbedding = Array.from({ length: 1536 }, () => Math.random())

      await documentService.storeEmbedding({
        documentId: 'doc-1',
        userId: 'user-123',
        sectionType: 'skills',
        content: 'React, TypeScript, Node.js',
        embedding: Array.from({ length: 1536 }, () => Math.random())
      })

      // Act
      const similar = await documentService.findSimilarDocuments(
        queryEmbedding,
        'user-123',
        0.8,
        5
      )

      // Assert
      expect(Array.isArray(similar)).toBe(true)
    })
  })
})
```

## End-to-End Testing

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test Examples

#### User Journey Tests

```typescript
// e2e/user-journeys/cv-analysis.spec.ts
import { test, expect } from '@playwright/test'

test.describe('CV Analysis User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('complete CV analysis workflow', async ({ page }) => {
    // Navigate to CV analysis
    await page.click('[data-testid="cv-analysis-nav"]')
    await expect(page).toHaveURL('/cv-analysis')

    // Upload CV
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles('test-files/sample-cv.pdf')

    // Wait for upload completion
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

    // Start analysis
    await page.click('[data-testid="start-analysis-button"]')

    // Wait for analysis to complete
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 60000 })

    // Verify analysis results
    await expect(page.locator('[data-testid="analysis-score"]')).toContainText('%')
    await expect(page.locator('[data-testid="improvement-suggestions"]')).toBeVisible()

    // Review and approve improvements
    await page.click('[data-testid="review-improvements"]')
    await expect(page.locator('[data-testid="improvement-list"]')).toBeVisible()

    // Select first improvement
    await page.click('[data-testid="improvement-0-checkbox"]')
    await page.click('[data-testid="apply-improvements"]')

    // Verify improved CV generation
    await expect(page.locator('[data-testid="improved-cv-preview"]')).toBeVisible()

    // Download improved CV
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-button"]')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('improved-cv')
  })

  test('handle analysis errors gracefully', async ({ page }) => {
    // Upload invalid file
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles('test-files/invalid-file.txt')

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid file type')

    // Try to start analysis (should be disabled)
    const startButton = page.locator('[data-testid="start-analysis-button"]')
    await expect(startButton).toBeDisabled()
  })

  test('document reuse functionality', async ({ page }) => {
    // Upload first document
    await page.goto('/documents')
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles('test-files/sample-cv.pdf')
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

    // Navigate to CV analysis
    await page.goto('/cv-analysis')

    // Select existing document
    await page.click('[data-testid="select-existing-document"]')
    await expect(page.locator('[data-testid="document-list"]')).toBeVisible()

    // Select first document
    await page.click('[data-testid="document-0"]')
    await page.click('[data-testid="use-selected-document"]')

    // Verify document is selected
    await expect(page.locator('[data-testid="selected-document"]')).toBeVisible()
    await expect(page.locator('[data-testid="start-analysis-button"]')).toBeEnabled()
  })
})
```

#### Cross-Browser Tests

```typescript
// e2e/cross-browser/responsiveness.spec.ts
import { test, devices } from '@playwright/test'

const devicesToTest = [
  devices['Desktop Chrome'],
  devices['Desktop Firefox'],
  devices['Desktop Safari'],
  devices['iPad Pro'],
  devices['iPhone 13 Pro']
]

for (const device of devicesToTest) {
  test.describe(`${device.name} responsiveness`, () => {
    test.use({ ...device })

    test('dashboard layout adapts correctly', async ({ page }) => {
      await page.goto('/dashboard')

      // Test navigation visibility
      if (device.isDesktop) {
        await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible()
      } else {
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      }

      // Test card layout
      const cards = page.locator('[data-testid="feature-card"]')
      await expect(cards.first()).toBeVisible()

      if (device.isMobile) {
        // Cards should stack vertically on mobile
        const firstCard = cards.first()
        const secondCard = cards.nth(1)
        const firstBox = await firstCard.boundingBox()
        const secondBox = await secondCard.boundingBox()

        expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height)
      }
    })

    test('document upload works on all devices', async ({ page }) => {
      await page.goto('/cv-analysis')

      // Test file upload
      const fileInput = page.locator('[data-testid="file-input"]')
      await fileInput.setInputFiles('test-files/sample-cv.pdf')

      // Verify upload works regardless of device
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 })
    })
  })
})
```

## Performance Testing

### Load Testing

```typescript
// tests/performance/load.test.ts
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now()

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime

    // Assert reasonable load times
    expect(loadTime).toBeLessThan(3000) // 3 seconds

    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const vitals = {}
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = entry.processingStart - entry.startTime
            }
            if (entry.entryType === 'layout-shift') {
              vitals.cls = entry.value
            }
          })
          resolve(vitals)
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
      })
    })

    expect(metrics.lcp).toBeLessThan(2500) // LCP under 2.5s
    expect(metrics.fid).toBeLessThan(100) // FID under 100ms
    expect(metrics.cls).toBeLessThan(0.1) // CLS under 0.1
  })

  test('document upload performance', async ({ page }) => {
    await page.goto('/cv-analysis')

    const startTime = Date.now()

    // Upload large file (5MB)
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles('test-files/large-cv.pdf')

    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

    const uploadTime = Date.now() - startTime
    expect(uploadTime).toBeLessThan(10000) // Under 10 seconds
  })

  test('concurrent user simulation', async ({ context }) => {
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ])

    // Simulate 3 concurrent users
    const promises = pages.map(async (page, index) => {
      await page.goto('/cv-analysis')
      await page.fill('[data-testid="email"]', `user${index}@example.com`)
      await page.fill('[data-testid="password"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const fileInput = page.locator('[data-testid="file-input"]')
      await fileInput.setInputFiles('test-files/sample-cv.pdf')

      return page.locator('[data-testid="upload-success"]').isVisible()
    })

    const results = await Promise.all(promises)
    expect(results.every(result => result)).toBe(true)
  })
})
```

## Security Testing

### Authentication Security Tests

```typescript
// tests/security/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Security Tests', () => {
  test('prevents unauthorized access', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = ['/dashboard', '/cv-analysis', '/documents']

    for (const route of protectedRoutes) {
      await page.goto(route)
      // Should redirect to login
      await expect(page).toHaveURL('/login')
    }
  })

  test('prevents session hijacking', async ({ context, page }) => {
    // Login as user 1
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'user1@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Get session cookie
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name === 'session-token')

    // Create new context with stolen session
    const maliciousContext = await context.browser().newContext()
    await maliciousContext.addCookies([sessionCookie])
    const maliciousPage = await maliciousContext.newPage()

    // Try to access with stolen session
    await maliciousPage.goto('/dashboard')

    // Should either be blocked or require re-authentication
    const currentUrl = maliciousPage.url()
    expect(currentUrl).toMatch(/(login|auth)/)

    await maliciousContext.close()
  })

  test('validates input sanitization', async ({ page }) => {
    await page.goto('/login')

    // Try XSS attack
    const xssPayload = '<script>alert("XSS")</script>'
    await page.fill('[data-testid="email"]', xssPayload)
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Should not execute JavaScript
    await expect(page.locator('text=XSS')).not.toBeVisible()

    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })

  test('enforces rate limiting', async ({ page }) => {
    await page.goto('/login')

    // Try multiple rapid login attempts
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="email"]', 'test@example.com')
      await page.fill('[data-testid="password"]', 'wrongpassword')
      await page.click('[data-testid="login-button"]')
    }

    // Should show rate limit message
    await expect(page.locator('text=Too many attempts')).toBeVisible()
  })
})
```

## Accessibility Testing

```typescript
// tests/accessibility/a11y.spec.ts
import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page)
  })

  test('dashboard accessibility', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        // Custom rule configuration if needed
      }
    })
  })

  test('keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')

    // Test tab navigation
    await page.keyboard.press('Tab')
    let focused = await page.locator(':focus')
    expect(focused).toBeVisible()

    // Navigate through all interactive elements
    const interactiveElements = page.locator('button, input, select, textarea, a[href]')
    const count = await interactiveElements.count()

    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab')
      focused = await page.locator(':focus')
      expect(focused).toBeVisible()
    }
  })

  test('screen reader compatibility', async ({ page }) => {
    await page.goto('/cv-analysis')

    // Check for proper ARIA labels
    const uploadButton = page.locator('[data-testid="upload-button"]')
    await expect(uploadButton).toHaveAttribute('aria-label')

    // Check for semantic HTML
    const main = page.locator('main')
    await expect(main).toBeVisible()

    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    await expect(headings.first()).toBeVisible()
  })

  test('color contrast and visual accessibility', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for sufficient color contrast
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })

    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('body')).toHaveClass(/dark/)

    // Test reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // Check that animations are disabled
  })
})
```

## Manual Testing

### User Acceptance Testing (UAT) Checklist

#### Document Upload Feature
- [ ] Users can upload PDF files
- [ ] Users can upload DOCX files
- [ ] Users can upload TXT files
- [ ] File size validation works (10MB limit)
- [ ] File type validation works
- [ ] Upload progress indicator is shown
- [ ] Success/error messages are displayed
- [ ] Uploaded documents appear in document list

#### CV Analysis Feature
- [ ] Users can select existing documents
- [ ] Analysis starts successfully
- [ ] Analysis progress is shown
- [ ] Results are displayed correctly
- [ ] Score is visible and meaningful
- [ ] Improvement suggestions are actionable
- [ ] Users can approve/reject suggestions
- [ ] Improved CV can be downloaded

#### Authentication
- [ ] User registration works
- [ ] Email validation works
- [ ] Password requirements are enforced
- [ ] Login works with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Logout works correctly
- [ ] Session persistence works
- [ ] Password reset works

#### Responsive Design
- [ ] Layout works on desktop (1920x1080)
- [ ] Layout works on tablet (768x1024)
- [ ] Layout works on mobile (375x667)
- [ ] Navigation is accessible on all devices
- [ ] Forms are usable on touch devices
- [ ] Text is readable without zooming

### Browser Compatibility Testing

#### Supported Browsers
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (latest version)

#### Test Scenarios
- [ ] Document upload works
- [ ] CV analysis completes
- [ ] User authentication works
- [ ] Navigation works correctly
- [ ] Forms submit correctly
- [ ] Error handling works

## Continuous Testing

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Setup test database
      run: npm run test:db:setup

    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright
      run: npx playwright install --with-deps

    - name: Build application
      run: npm run build

    - name: Run E2E tests
      run: npm run test:e2e

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
```

### Quality Gates

```bash
# Package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run src/lib/__tests__ src/components/__tests__",
    "test:integration": "vitest run src/actions/__tests__",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "pre-commit": "npm run lint && npm run type-check && npm run test:unit"
  }
}
```

## Test Coverage

### Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Statements** | 90% | TBD |
| **Branches** | 85% | TBD |
| **Functions** | 90% | TBD |
| **Lines** | 90% | TBD |

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html

# Generate coverage badge
npx coverage-badges
```

### Coverage by Module

- **Services**: 95% coverage required
- **Components**: 90% coverage required
- **Actions**: 85% coverage required
- **Utilities**: 95% coverage required

This comprehensive testing guide ensures the AI Job Hunt Agent maintains high quality, reliability, and user experience across all features and platforms.