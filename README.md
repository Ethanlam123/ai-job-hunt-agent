# AI Job Hunt Agent

An AI-powered job hunting assistant built with Next.js 16, LangGraph.js, and Supabase. Features CV analysis, cover letter generation, interview preparation, and skill gap analysis with a human-in-the-loop approach.

## Features

- 📄 **CV Analysis**: AI-powered CV analysis with improvement suggestions
- ✉️ **Cover Letter Generation**: Personalized cover letters from CV + job description
- 🎯 **Interview Preparation**: Mock questions and answer evaluation
- 📊 **Document Management**: Upload and manage CVs and job descriptions
- 🔒 **Privacy-First**: No automatic job applications
- 👤 **Human-in-the-Loop**: All CV changes require explicit user approval

## Tech Stack

- **Frontend**: Next.js 16 with React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage), LangGraph.js, LangChain
- **AI**: OpenRouter (LLM), OpenAI (embeddings)
- **UI**: shadcn/ui components with Radix UI

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account with pgvector extension enabled
- OpenRouter API key
- OpenAI API key

### Installation

1. Clone the repository
   ```bash
   git clone <your-repo-url>
   cd ai-job-hunt-agent
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Set up the database
   ```bash
   npm run db:push  # Push schema to Supabase
   npm run db:apply-rls  # Apply Row Level Security policies
   ```

5. Run the development server
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Architecture overview and development guide
- **[TESTING.md](./TESTING.md)** - Comprehensive testing workflows
- **[spec-nextjs.md](./spec-nextjs.md)** - Detailed technical specifications

## Database Commands

```bash
npm run db:generate  # Generate migration files
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
npm run db:cleanup   # Clean database
npm run db:apply-rls # Apply RLS policies
```

## License

MIT
