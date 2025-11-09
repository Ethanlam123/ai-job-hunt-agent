# Components Documentation

This document provides an overview of all React components used in the AI Job Hunt Agent application.

## Component Structure

### UI Components (`src/components/ui/`)

Base UI components built with shadcn/ui and Radix UI. These are reusable design system components.

#### Key UI Components:
- **Button**: Interactive button component with variants
- **Input**: Form input with validation states
- **Dialog**: Modal dialog component
- **Select**: Dropdown selection component
- **Tabs**: Tab navigation component
- **Progress**: Progress bar component
- **Avatar**: User avatar component
- **Checkbox**: Checkbox input component
- **Label**: Form label component
- **Separator**: Visual separator component
- **Slot**: Flexible component composition primitive

### Feature Components (`src/components/[feature]/`)

Business logic components organized by feature:

#### Authentication (`src/components/auth/`)
- **AuthForm**: Base form component for login/register
- **LoginForm**: User login form
- **RegisterForm**: User registration form

#### Document Management (`src/components/documents/`)
- **DocumentUploader**: File upload component with drag-and-drop
- **DocumentSelector**: Dropdown for selecting existing documents
- **DocumentPreviewDialog**: Modal for previewing document content
- **DocumentsClient**: Main document management interface

#### CV Analysis (`src/components/cv/`)
- **CVAnalysisInterface**: Main CV analysis UI
- **CVResultsDisplay**: Displays analysis results
- **CVImprovementSuggestions**: Shows improvement recommendations
- **ApprovalWorkflow**: Human-in-the-loop approval interface

#### Cover Letter (`src/components/cover-letter/`)
- **CoverLetterForm**: Form for generating cover letters
- **CoverLetterDisplay**: Shows generated cover letters
- **CoverLetterHistory**: List of previous cover letters

#### Interview (`src/components/interview/`)
- **InterviewInterface**: Mock interview interface
- **QuestionDisplay**: Shows interview questions
- **AnswerInput**: Input for interview answers
- **InterviewFeedback**: Displays performance analysis

#### Skill Gap (`src/components/skill-gap/`)
- **SkillGapForm**: Form for skill gap analysis
- **SkillGapResults**: Displays skill gap analysis
- **SkillGapTimeline**: Visual timeline of learning roadmap
- **SkillGapTracker**: Progress tracking interface

#### Upload (`src/components/upload/`)
- **UploadInterface**: File upload interface
- **UploadProgress**: Upload progress indicator
- **UploadValidation**: File validation feedback

### Layout Components (`src/components/layout/`)

- **Header**: Application header
- **Sidebar**: Navigation sidebar
- **Footer**: Application footer
- **Navigation**: Main navigation component

## Component Architecture Patterns

### Server vs Client Components

**Server Components (Default):**
- Used for static content and data fetching
- No `use client` directive
- Can directly access server-side resources
- Better for SEO and performance

**Client Components:**
- Marked with `use client` directive
- Used for interactivity (onClick, useState, etc.)
- Handle user interactions and state
- Minimize usage for better performance

### Form Patterns

Most forms follow this pattern:
```typescript
interface FormProps {
  onSubmit: (data: FormData) => Promise<void>
  initialData?: any
  disabled?: boolean
}

export function FeatureForm({ onSubmit, initialData, disabled }: FormProps) {
  // Form implementation
}
```

### Data Fetching Patterns

Components use Server Actions for data mutations:
```typescript
'use client'

import { actionName } from '@/actions/feature'

export function Component() {
  const handleSubmit = async (formData: FormData) => {
    await actionName(formData)
  }
}
```

### Error Handling

Components use error boundaries and try-catch patterns:
```typescript
try {
  const result = await serverAction(data)
  // Handle success
} catch (error) {
  // Handle error
  setError(error.message)
}
```

## Component Props Documentation

### Common Props

Many components share these common props:

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Additional CSS classes |
| `disabled` | `boolean` | Disable component interactions |
| `onSuccess` | `function` | Success callback |
| `onError` | `function` | Error callback |
| `loading` | `boolean` | Show loading state |

### File Upload Props

For upload components:
```typescript
interface UploadProps {
  accept: string[] // Accepted file types
  maxSize: number // Max file size in bytes
  onUpload: (file: File) => Promise<void>
  multiple?: boolean // Allow multiple files
}
```

## Styling Approach

### Tailwind CSS Integration

Components use Tailwind CSS with these patterns:
- **Responsive Design**: `sm:`, `md:`, `lg:` prefixes
- **Dark Mode**: `dark:` prefixes
- **Component Variants**: Using class-variance-authority
- **shadcn/ui Integration**: Consistent design system

### CSS Variables

Custom CSS variables for theming:
```css
--primary: 222.2 84% 4.9%;
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96%;
--muted: 210 40% 96%;
/* ... */
```

## Accessibility Features

### ARIA Support

Components include proper ARIA attributes:
- `aria-label` for screen readers
- `aria-describedby` for form descriptions
- `aria-expanded` for toggle states
- `role` attributes for semantic meaning

### Keyboard Navigation

- Tab order management
- Enter/Space key handlers
- Escape key for modals
- Arrow keys for dropdowns

## Testing Components

### Unit Tests

Component tests follow this pattern:
```typescript
import { render, screen } from '@testing-library/react'
import { Component } from '@/components/feature'

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />)
    expect(screen.getByText('Expected text')).toBeInTheDocument()
  })
})
```

### Integration Tests

End-to-end component testing:
- User interactions
- Form submissions
- Error scenarios
- Loading states

## Best Practices

### Performance

- **Server Components**: Use by default
- **Code Splitting**: Dynamic imports for large components
- **Memoization**: React.memo for expensive renders
- **Image Optimization**: Next.js Image component

### Security

- **Input Validation**: Client and server-side
- **XSS Prevention**: Proper text sanitization
- **CSRF Protection**: Built into Next.js forms
- **Content Security Policy**: Proper headers

### Maintainability

- **TypeScript**: Strict typing for all props
- **Documentation**: JSDoc comments for complex components
- **Testing**: 90% coverage requirement
- **Linting**: ESLint rules enforcement

## Component Development Workflow

1. **Create Component**: Add to appropriate directory
2. **Add Types**: Define TypeScript interfaces
3. **Write Tests**: Unit and integration tests
4. **Documentation**: Update this file
5. **Code Review**: Peer review process
6. **Integration**: Add to page/layout

## Future Enhancements

- **Component Library**: Extract to separate package
- **Storybook**: Interactive component documentation
- **Design Tokens**: Centralized design system
- **Component Testing**: Visual regression testing