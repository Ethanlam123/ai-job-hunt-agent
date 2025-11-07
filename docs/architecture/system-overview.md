# System Architecture Overview

This document provides a comprehensive overview of the AI Job Hunt Agent system architecture, including components, data flows, and technology stack.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React UI Components]
        Auth[Authentication Components]
        Forms[Form Components]
    end

    subgraph "Next.js Application Layer"
        Pages[App Router Pages]
        Layouts[Layout Components]
        ServerActions[Server Actions]
        Middleware[Auth Middleware]
    end

    subgraph "Business Logic Layer"
        Agents["AI Agents<br/>CV, Interview, Cover Letter, Skill Gap"]
        Services["Business Services<br/>Document Parser, LLM Service, Cache"]
        Prompts[LLM Prompts]
    end

    subgraph "Data Layer"
        Supabase["Supabase<br/>PostgreSQL + pgvector"]
        Storage["Supabase Storage"]
        AuthProvider["Supabase Auth"]
    end

    subgraph "External Services"
        OpenRouter["OpenRouter API<br/>GPT-5-nano"]
        OpenAI["OpenAI API<br/>Embeddings"]
    end

    UI --> Pages
    Auth --> Middleware
    Forms --> ServerActions

    Pages --> ServerActions
    ServerActions --> Agents
    ServerActions --> Services

    Agents --> Services
    Services --> Prompts

    Services --> OpenRouter
    Services --> OpenAI
    ServerActions --> Supabase
    Services --> Storage
    Middleware --> AuthProvider

    Supabase --> AuthProvider
```

## Component Architecture

### Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js App Router"
        Layout[Root Layout]
        AuthLayout["(auth) Layout"]
        DashboardLayout["(dashboard) Layout"]

        HomePage[Home Page]
        AuthPages[Login/Register Pages]
        DashboardPages[Feature Pages]
    end

    subgraph "Component Hierarchy"
        UI[shadcn/ui Components]
        Forms[Form Components]
        Business[Business Components]
        Shared[Shared Components]
    end

    Layout --> AuthLayout
    Layout --> DashboardLayout
    Layout --> HomePage

    AuthLayout --> AuthPages
    DashboardLayout --> DashboardPages

    DashboardPages --> Business
    Business --> UI
    Business --> Forms
    Business --> Shared
```

### AI Agent Architecture

```mermaid
graph TB
    subgraph "Agent Orchestration"
        Orchestrator["Orchestrator Agent<br/>LangGraph.js"]

        subgraph "Specialized Agents"
            CVAgent[CV Analysis Agent]
            InterviewAgent[Interview Prep Agent]
            CoverLetterAgent[Cover Letter Agent]
            SkillGapAgent[Skill Gap Agent]
        end
    end

    subgraph "Agent Capabilities"
        DocumentProcessing["Document Processing<br/>PDF/DOCX/TXT Parsing"]
        LLMIntegration["LLM Integration<br/>OpenRouter + OpenAI"]
        VectorEmbeddings["Vector Embeddings<br/>pgvector Storage"]
        TaskManagement["Task Management<br/>Background Processing"]
    end

    Orchestrator --> CVAgent
    Orchestrator --> InterviewAgent
    Orchestrator --> CoverLetterAgent
    Orchestrator --> SkillGapAgent

    CVAgent --> DocumentProcessing
    InterviewAgent --> DocumentProcessing
    CoverLetterAgent --> DocumentProcessing
    SkillGapAgent --> DocumentProcessing

    CVAgent --> LLMIntegration
    InterviewAgent --> LLMIntegration
    CoverLetterAgent --> LLMIntegration
    SkillGapAgent --> LLMIntegration

    LLMIntegration --> VectorEmbeddings
    DocumentProcessing --> TaskManagement
```

## Database Architecture

### Schema Overview

```mermaid
erDiagram
    users ||--o{ sessions : "has many"
    users ||--o{ documents : "uploads"
    users ||--o{ cv_embeddings : "generates"
    users ||--o{ tasks : "initiates"
    users ||--o{ skill_gaps : "analyzes"

    sessions ||--o{ messages : "contains"
    sessions ||--o{ documents : "references"
    sessions ||--o{ job_descriptions : "creates"
    sessions ||--o{ tasks : "tracks"
    sessions ||--o{ skill_gaps : "produces"

    documents ||--o{ cv_embeddings : "generates"
    documents ||--o{ tasks : "triggers"

    users {
        uuid id PK
        varchar email UK
        timestamp created_at
        timestamp updated_at
    }

    sessions {
        uuid id PK
        uuid user_id FK
        varchar current_stage
        jsonb state
        timestamp created_at
        timestamp updated_at
        timestamp completed_at
    }

    documents {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        varchar document_type
        varchar original_filename
        varchar file_path
        varchar file_format
        jsonb parsed_content
        jsonb metadata
        timestamp created_at
    }

    cv_embeddings {
        uuid id PK
        uuid document_id FK
        uuid user_id FK
        varchar section_type
        text content
        vector embedding
        jsonb metadata
        timestamp created_at
    }

    job_descriptions {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        varchar title
        varchar company
        text description
        jsonb requirements
        jsonb parsed_content
        vector embedding
        jsonb metadata
        timestamp created_at
    }

    tasks {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        varchar task_type
        varchar status
        jsonb result
        text error_message
        jsonb metadata
        timestamp created_at
        timestamp completed_at
    }

    skill_gaps {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        jsonb analysis_result
        varchar status
        jsonb missing_skills
        jsonb timeline
        timestamp created_at
        timestamp updated_at
    }

    messages {
        uuid id PK
        uuid session_id FK
        varchar role
        text content
        jsonb metadata
        timestamp created_at
    }
```

### Row Level Security (RLS)

```mermaid
graph TB
    subgraph "RLS Policy Structure"
        UserContext["User Context<br/>auth.uid()"]

        subgraph "Data Access Rules"
            UserData["User Data<br/>user_id = auth.uid()"]
            SessionData["Session Data<br/>user_id = auth.uid()"]
            DocumentData["Document Data<br/>user_id = auth.uid()"]
            TaskData["Task Data<br/>user_id = auth.uid()"]
        end

        subgraph "Cache Rules"
            UserCache["User Cache<br/>user:{userId}:*"]
            PublicCache["Public Cache<br/>public:*"]
        end
    end

    UserContext --> UserData
    UserContext --> SessionData
    UserContext --> DocumentData
    UserContext --> TaskData
    UserContext --> UserCache

    UserData -.->|"RLS Policy"| DocumentData
    SessionData -.->|"RLS Policy"| TaskData
    UserCache -.->|"Cache Policy"| PublicCache
```

## Data Flow Architecture

### CV Analysis Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Frontend UI
    participant SA as Server Action
    participant Agent as CV Agent
    participant LLM as LLM Service
    participant DB as Supabase
    participant Storage as File Storage

    User->>UI: Upload CV
    UI->>SA: triggerCVAnalysis(file)
    SA->>Storage: Store file
    SA->>DB: Create document record
    SA->>SA: Parse document content
    SA->>DB: Create task record
    SA->>Agent: analyzeCV(documentId, sessionId)

    Agent->>Agent: Extract CV sections
    Agent->>LLM: Analyze CV structure
    LLM-->>Agent: Analysis results
    Agent->>LLM: Generate improvements
    LLM-->>Agent: Improvement suggestions
    Agent->>DB: Store results

    SA->>DB: Update task status
    SA-->>UI: Return task ID
    UI->>User: Show analysis started

    loop Real-time Updates
        UI->>SA: getTaskStatus(taskId)
        SA->>DB: Query task status
        SA-->>UI: Return status
        UI->>User: Update progress
    end
```

### Document Processing Flow

```mermaid
flowchart TD
    Start([File Upload]) --> Validate{Validate File}
    Validate -->|Invalid| Error[Return Error]
    Validate -->|Valid| Store[Store in Supabase Storage]
    Store --> Parse{Parse Document}

    Parse -->|PDF| PDFParser["PDF Parser<br/>pdf-parse"]
    Parse -->|DOCX| DocxParser["DOCX Parser<br/>mammoth"]
    Parse -->|TXT| TextParser["Text Parser<br/>Direct extraction"]

    PDFParser --> Extract[Extract Content]
    DocxParser --> Extract
    TextParser --> Extract

    Extract --> Structure["Structure Content<br/>Sections, Metadata"]
    Structure --> Embed["Generate Embeddings<br/>OpenAI text-embedding-3-small"]
    Embed --> StoreEmbed[Store in pgvector]
    StoreEmbed --> Cache[Cache Content]
    Cache --> Success([Return Document ID])

    Error --> End([Process Complete])
    Success --> End
```

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.0 | Full-stack React framework |
| React | 19.2.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | Latest | Component library |
| Radix UI | Latest | Headless components |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | Backend-as-a-Service |
| PostgreSQL | Latest | Primary database |
| pgvector | Latest | Vector embeddings |
| Drizzle ORM | Latest | Type-safe database access |
| LangGraph.js | Latest | Agent orchestration |
| LangChain.js | Latest | LLM integration |

### AI/ML Stack

| Technology | Purpose |
|------------|---------|
| OpenRouter | LLM hosting (GPT-5-nano) |
| OpenAI | Text embeddings |
| LangChain | LLM orchestration tools |
| Vector Search | Semantic similarity matching |

## Security Architecture

### Authentication Flow

```mermaid
graph TB
    User[User] --> Login[Login Page]
    Login --> SupabaseAuth[Supabase Auth]
    SupabaseAuth --> JWT[JWT Token]
    JWT --> Cookie[HTTP-Only Cookie]
    Cookie --> Middleware[Middleware Validation]
    Middleware --> ServerAction[Server Action]
    ServerAction --> RLS[RLS Policy Check]
    RLS --> Database[Database Access]
```

### Security Layers

1. **Authentication Layer**
   - Supabase Auth with JWT tokens
   - HTTP-only cookie sessions
   - Automatic token refresh

2. **Authorization Layer**
   - Row Level Security (RLS) policies
   - User-scoped data access
   - Cache access control via regex patterns

3. **Input Validation**
   - File type and size restrictions
   - Content sanitization
   - Type-safe Server Actions

4. **Rate Limiting**
   - PostgreSQL-based sliding window
   - User-specific rate limits
   - API endpoint protection

## Performance Architecture

### Caching Strategy

```mermaid
graph TB
    Request[Incoming Request] --> CacheCheck{Cache Check}
    CacheCheck -->|Hit| CacheHit[Return Cached Data]
    CacheCheck -->|Miss| Process[Process Request]
    Process --> Database[Database Query]
    Database --> Store[Store in Cache]
    Store --> CacheHit

    subgraph "Cache Types"
        L1["User Cache<br/>user:{userId}:*"]
        L2["Public Cache<br/>public:*"]
        L3["TTL Cache<br/>Time-based expiration"]
    end

    Store --> L1
    Store --> L2
    Store --> L3
```

### Background Processing

```mermaid
stateDiagram-v2
    [*] --> Processing: Start Task
    Processing --> Completed: Success
    Processing --> Failed: Error
    Processing --> Processing: Update Progress

    Completed --> [*]: Clean Up
    Failed --> [*]: Clean Up

    note right of Processing
        Long-running operations:
        - CV Analysis
        - Cover Letter Generation
        - Interview Preparation
        - Skill Gap Analysis
    end note
```

## Deployment Architecture

### Vercel Deployment

```mermaid
graph TB
    subgraph "Development"
        DevLocal[Local Development]
        DevDB[Development Database]
    end

    subgraph "Production"
        Vercel[Vercel Edge Functions]
        SupabaseProd[Supabase Production]
        CDN[Edge CDN]
    end

    DevLocal --> DevDB
    Vercel --> SupabaseProd
    CDN --> Vercel

    subgraph "CI/CD"
        GitHub[GitHub Repository]
        Actions[GitHub Actions]
        Deploy[Auto Deploy]
    end

    GitHub --> Actions
    Actions --> Deploy
    Deploy --> Vercel
```

## Monitoring and Observability

### Error Handling

```mermaid
graph TB
    Error[Error Occurs] --> TryCatch[try/catch Block]
    TryCatch --> Log[Error Logging]
    Log --> UserError[User-friendly Error]
    Log --> AdminAlert[Admin Alert]
    UserError --> Fallback[Fallback Behavior]
    AdminAlert --> Dashboard[Error Dashboard]
```

### Performance Monitoring

- **Client-side**: Web Vitals monitoring
- **Server-side**: Function execution times
- **Database**: Query performance tracking
- **External APIs**: Response time monitoring
- **User metrics**: Feature usage analytics

## Scalability Considerations

### Horizontal Scaling

- **Serverless Functions**: Vercel automatically scales
- **Database**: Supabase connection pooling
- **File Storage**: Supabase Storage auto-scaling
- **CDN**: Global edge distribution

### Optimization Strategies

1. **Database Optimization**
   - Proper indexing on foreign keys
   - Vector index for similarity search
   - Connection pooling

2. **Caching Layers**
   - Content caching with TTL
   - User-specific cache partitions
   - Database query result caching

3. **Resource Management**
   - Background job queuing
   - Memory-efficient document parsing
   - Lazy loading of large components

## Development Architecture

### Code Organization

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected routes
│   ├── api/               # API endpoints
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Auth components
│   └── [feature]/        # Feature components
├── actions/              # Server Actions
├── lib/                  # Library code
│   ├── agents/          # AI agents
│   ├── services/        # Business services
│   ├── prompts/         # LLM prompts
│   └── utils/           # Utilities
└── types/               # TypeScript definitions
```

### Development Workflow

```mermaid
graph LR
    Feature[Feature Branch] --> PR[Pull Request]
    PR --> CI[CI/CD Pipeline]
    CI --> Test[Automated Tests]
    Test --> Build[Build Check]
    Build --> Deploy[Deploy to Staging]
    Deploy --> Review[Code Review]
    Review --> Merge[Merge to Main]
    Merge --> Production[Deploy to Production]
```

This architecture provides a robust, scalable, and maintainable foundation for the AI Job Hunt Agent application, ensuring security, performance, and excellent user experience.