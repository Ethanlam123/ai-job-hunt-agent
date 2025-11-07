# Contribution Guidelines

This document outlines the guidelines for contributing to the AI Job Hunt Agent project, including development workflows, coding standards, and community practices.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** and **npm 9+** installed
- **Git** configured with your name and email
- **GitHub account** with two-factor authentication enabled
- **VS Code** (recommended) with project extensions installed
- **Development environment** set up (see [Development Guide](./development-guide.md))

### Initial Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/ai-job-hunt-agent.git
   cd ai-job-hunt-agent
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/original-owner/ai-job-hunt-agent.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Up Development Environment**
   ```bash
   cp .env.example .env
   # Configure your local environment variables
   npm run db:setup  # Set up local database
   ```

5. **Verify Setup**
   ```bash
   npm run dev
   # Verify the application runs on http://localhost:3000
   ```

## Development Workflow

### 1. Create an Issue

Before starting work:

- **Check existing issues** to avoid duplication
- **Create a new issue** describing the feature or bug fix
- **Wait for approval** from maintainers before starting
- **Reference the issue** in your commits and pull request

### 2. Create a Feature Branch

```bash
# Sync with upstream main
git fetch upstream
git checkout upstream/main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-number-description
```

#### Branch Naming Conventions

- **Features**: `feature/feature-name`
- **Bug fixes**: `fix/issue-number-description`
- **Documentation**: `docs/update-description`
- **Refactoring**: `refactor/component-name`
- **Performance**: `perf/optimization-area`

### 3. Development Process

#### Make Changes

- Follow the [coding standards](#code-standards)
- Write **self-documenting code**
- Add **comprehensive comments** for complex logic
- Keep changes **focused and atomic**

#### Test Your Changes

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Build project
npm run build

# Start development server
npm run dev
```

#### Database Changes

If you modify database schema:

```bash
# Generate migration
npm run db:generate

# Apply migration locally
npm run db:migrate

# Test in development
npm run dev
```

### 4. Commit Your Changes

#### Commit Message Format

Use conventional commits:

```bash
# Format: <type>(<scope>): <description>

# Features
git commit -m "feat(cv-analysis): add AI improvement suggestions"

# Bug fixes
git commit -m "fix(auth): resolve login redirect loop"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactoring
git commit -m "refactor(components): extract common button logic"

# Performance
git commit -m "perf(database): add index for document queries"

# Breaking changes
git commit -m "feat!: change API response structure"
```

#### Commit Types

- **feat**: New feature or enhancement
- **fix**: Bug fix or patch
- **docs**: Documentation changes
- **style**: Code formatting, linting
- **refactor**: Code refactoring without functional changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependencies
- **feat!**: Breaking changes (use exclamation mark)

#### Commit Guidelines

- **Keep commits small** and focused
- **Write clear, descriptive messages**
- **Use present tense**: "add" not "added"
- **Reference issues**: `fixes #123`
- **Include testing notes** if relevant

### 5. Create Pull Request

#### Before Submitting

1. **Sync with Upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Resolve Conflicts**
   ```bash
   # If rebase has conflicts
   git status
   # Resolve conflicts
   git add .
   git rebase --continue
   ```

3. **Run Full Test Suite**
   ```bash
   npm run lint
   npm run build
   npm run test
   ```

#### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Issue Number
Fixes #123 (if applicable)

## How Has This Been Tested?
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)

## Testing Environment
- Node.js version:
- Browser(s):
- Operating System:

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information about the change.
```

## Code Standards

### TypeScript Standards

#### Type Safety

```typescript
// ✅ Good: Explicit types
interface UserData {
  id: string
  name: string
  email: string
  createdAt: Date
}

async function getUser(id: string): Promise<UserData | null> {
  // Implementation
}

// ❌ Bad: Implicit any
async function getUser(id) {
  // Implementation
}
```

#### Error Handling

```typescript
// ✅ Good: Proper error handling
export async function createUser(data: CreateUserInput): Promise<CreateUserResult> {
  try {
    const user = await userService.create(data)
    return { success: true, data: user }
  } catch (error) {
    console.error('User creation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ❌ Bad: No error handling
export async function createUser(data: CreateUserInput) {
  return await userService.create(data)
}
```

### React Standards

#### Component Structure

```typescript
// ✅ Good: Proper component structure
interface DocumentUploaderProps {
  onUpload: (document: UploadedDocument) => void
  acceptedTypes?: string[]
  maxSize?: number
}

export function DocumentUploader({
  onUpload,
  acceptedTypes = ['.pdf', '.docx'],
  maxSize = 10 * 1024 * 1024 // 10MB
}: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    // Implementation
  }

  return (
    <div className="document-uploader">
      {/* JSX content */}
    </div>
  )
}
```

#### State Management

```typescript
// ✅ Good: Proper state management
const [documents, setDocuments] = useState<UploadedDocument[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// ✅ Good: Custom hooks for complex state
function useDocuments() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [loading, setLoading] = useState(false)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getDocumentsAction()
      setDocuments(result.data || [])
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  return { documents, loading, reload: loadDocuments }
}
```

### CSS and Styling Standards

#### Tailwind CSS

```typescript
// ✅ Good: Consistent Tailwind classes
<div className="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow-sm border">
  <h2 className="text-lg font-semibold text-gray-900">
    Document Upload
  </h2>
  <p className="text-sm text-gray-600">
    Upload your CV for analysis
  </p>
</div>

// ❌ Bad: Inconsistent styling
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow border">
  <h2 className="text-lg font-bold text-gray-900">
    Document Upload
  </h2>
  <p className="text-sm text-gray-500">
    Upload your CV for analysis
  </p>
</div>
```

#### Responsive Design

```typescript
// ✅ Good: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {documents.map(doc => (
    <DocumentCard key={doc.id} document={doc} />
  ))}
</div>
```

## Testing Requirements

### Unit Tests

#### Test Coverage

All new code must have:

- **Unit tests** for functions and components
- **Integration tests** for user workflows
- **Edge case testing** for error conditions
- **Mock testing** for external dependencies

#### Example Unit Test

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
      const mockBuffer = Buffer.from('mock pdf content')

      const result = await parser.parseDocument(mockBuffer, 'pdf')

      expect(result).toEqual({
        text: expect.any(String),
        documents: expect.any(Array),
        metadata: expect.objectContaining({
          pages: expect.any(Number)
        })
      })
    })

    it('should handle unsupported file types', async () => {
      const buffer = Buffer.from('content')

      await expect(
        parser.parseDocument(buffer, 'unsupported')
      ).rejects.toThrow('Unsupported file type: unsupported')
    })

    it('should handle empty files', async () => {
      const emptyBuffer = Buffer.alloc(0)

      const result = await parser.parseDocument(emptyBuffer, 'txt')

      expect(result.text).toBe('')
      expect(result.documents).toHaveLength(0)
    })
  })
})
```

#### Component Testing

```typescript
// src/components/__tests__/document-uploader.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentUploader } from '../document-uploader'

describe('DocumentUploader', () => {
  const mockOnUpload = vi.fn()

  beforeEach(() => {
    mockOnUpload.mockClear()
  })

  it('should render upload button', () => {
    render(<DocumentUploader onUpload={mockOnUpload} />)

    expect(screen.getByText('Upload Document')).toBeInTheDocument()
  })

  it('should call onUpload when valid file is selected', async () => {
    const user = userEvent.setup()
    render(<DocumentUploader onUpload={mockOnUpload} />)

    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf'
    })

    const input = screen.getByRole('button')
    await user.click(input)

    // Mock file selection
    const fileInput = screen.getByLabelText('Upload Document')
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file)
    })
  })

  it('should show error for invalid file type', async () => {
    const user = userEvent.setup()
    render(<DocumentUploader onUpload={mockOnUpload} acceptedTypes={['.pdf']} />)

    const invalidFile = new File(['test'], 'test.txt', {
      type: 'text/plain'
    })

    const input = screen.getByRole('button')
    await user.click(input)

    const fileInput = screen.getByLabelText('Upload Document')
    await user.upload(fileInput, invalidFile)

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
    })

    expect(mockOnUpload).not.toHaveBeenCalled()
  })
})
```

### Integration Tests

```typescript
// src/actions/__tests__/documents.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { uploadDocument } from '../documents'

// Mock dependencies
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/services/document-service')

describe('uploadDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload document successfully', async () => {
    // Arrange
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockSupabase = {
      auth: { getUser: vi.fn().ResolvedValue({ data: { user: mockUser } }) },
      storage: { from: vi.fn().mockReturnValue({ upload: vi.fn() }) },
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ data: { id: 'doc-123' } }) })
    }

    const mockFile = new File(['content'], 'test.pdf', {
      type: 'application/pdf'
    })

    // Act
    const result = await uploadDocument({
      file: mockFile,
      userId: 'user-123'
    })

    // Assert
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 'doc-123' })
  })

  it('should handle authentication failure', async () => {
    // Arrange
    const mockSupabase = {
      auth: { getUser: vi.fn().ResolvedValue({ data: { user: null }, error: new Error('Unauthorized') }) }
    }

    // Act
    const result = await uploadDocument({
      file: new File(['content'], 'test.pdf'),
      userId: 'invalid-user'
    })

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test src/lib/services/__tests__/document-parser.test.ts
```

## Documentation Standards

### Code Documentation

#### JSDoc Comments

```typescript
/**
 * Parses a document and extracts text content using appropriate parsers.
 *
 * @param buffer - The file buffer to parse
 * @param fileExtension - The file extension (pdf, docx, txt)
 * @returns Promise resolving to parsed document content
 * @throws {Error} When file type is unsupported or parsing fails
 *
 * @example
 * ```typescript
 * const parser = new DocumentParser()
 * const result = await parser.parseDocument(fileBuffer, 'pdf')
 * console.log(result.text)
 * ```
 */
export async function parseDocument(
  buffer: Buffer,
  fileExtension: string
): Promise<ParsedDocument> {
  // Implementation
}
```

#### Component Documentation

```typescript
/**
 * DocumentUploader Component
 *
 * Allows users to upload documents for analysis.
 * Supports PDF, DOCX, and TXT file formats.
 *
 * @param onUpload - Callback function called when document is uploaded
 * @param acceptedTypes - Array of accepted file extensions
 * @param maxSize - Maximum file size in bytes (default: 10MB)
 *
 * @example
 * ```tsx
 * <DocumentUploader
 *   onUpload={handleUpload}
 *   acceptedTypes={['.pdf', '.docx']}
 *   maxSize={5 * 1024 * 1024}
 * />
 * ```
 */
```

### README Updates

When adding features:

1. **Update main README** with feature overview
2. **Add setup instructions** if required
3. **Include examples** and usage patterns
4. **Update troubleshooting** section

### API Documentation

For Server Actions:

```typescript
/**
 * Uploads a document to Supabase Storage and creates database record.
 *
 * @param input - Upload input containing file and metadata
 * @returns Promise resolving to upload result
 *
 * @example
 * ```typescript
 * const result = await uploadDocument({
 *   file: selectedFile,
 *   userId: 'user-123'
 * })
 *
 * if (result.success) {
 *   console.log('Document uploaded:', result.data)
 * }
 * ```
 */
```

## Pull Request Process

### 1. Pre-Submission Checklist

Before creating a pull request:

- [ ] **Code compiles** without errors or warnings
- [ ] **All tests pass** (`npm run test`)
- [ ] **Linting passes** (`npm run lint`)
- [ ] **Build succeeds** (`npm run build`)
- [ ] **Documentation updated** for new features
- [ ] **Database migrations** included if schema changed
- [ ] **Performance impact** considered
- [ ] **Security implications** reviewed

### 2. Pull Request Requirements

#### Title Format

```bash
# Format: <type>(<scope>): <description>
feat(cv-analysis): add AI improvement suggestions
fix(auth): resolve login redirect loop
docs(readme): update installation instructions
```

#### Description Template

```markdown
## Summary
Brief description of what this PR changes.

## Changes
- List of specific changes made
- Include technical details if relevant

## Testing
- How you tested these changes
- What test coverage was added

## Screenshots
If applicable, include screenshots

## Related Issues
Closes #123
```

### 3. Review Process

#### Reviewer Checklist

- **Code Quality**: Is the code well-written and maintainable?
- **Functionality**: Does it work as intended?
- **Testing**: Are tests comprehensive and appropriate?
- **Documentation**: Is documentation accurate and complete?
- **Performance**: Are there performance concerns?
- **Security**: Are security best practices followed?
- **Breaking Changes**: Will this break existing functionality?

#### Review Guidelines

1. **Be constructive** and specific in feedback
2. **Focus on the code**, not the author
3. **Ask questions** if something is unclear
4. **Suggest improvements** rather than just pointing out issues
5. **Approve** only when all concerns are addressed

### 4. Merge Process

#### Requirements for Merge

- [ ] **At least one approval** from maintainer
- [ ] **All CI checks passing**
- [ ] **No merge conflicts**
- [ ] **Documentation updated**
- [ ] **Tests passing**

#### Merge Strategy

- **Squash and merge** for feature branches
- **Create merge commit** for significant changes
- **Delete feature branch** after merge

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- **Be respectful** and considerate
- **Use inclusive language**
- **Focus on constructive feedback**
- **Help others learn and grow**
- **Report inappropriate behavior**

### Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and ideas
- **Pull Requests**: For code contributions and reviews

### Getting Help

If you need help:

1. **Check existing documentation** and issues
2. **Search for similar problems** in issues
3. **Ask questions** in GitHub Discussions
4. **Contact maintainers** for urgent issues

### Recognition

Contributors are recognized through:

- **Contributor list** in README
- **Release notes** mentioning contributors
- **Community appreciation** in discussions

Thank you for contributing to the AI Job Hunt Agent project! Your contributions help make this project better for everyone.