# AI Job Hunt Agent

A comprehensive AI-powered job hunting system built with Next.js 16 and Supabase.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Setup database
npm run db:push && npm run db:apply-rls

# Start development
npm run dev
```

## Features

- **CV Analysis**: AI-powered resume improvement suggestions
- **Skill Gap Analysis**: Compare your skills against job requirements
- **Interview Preparation**: Generate practice questions and get feedback
- **Cover Letter Generation**: Create personalized cover letters
- **Document Management**: Upload and manage CVs and job descriptions

## Architecture

- **Frontend**: Next.js 16 with React 19 and TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: LangChain.js with OpenRouter and OpenAI
- **Security**: Row Level Security (RLS) policies

## Project Structure

```
├── app/                    # Next.js 16 App Router
├── components/             # React components
├── lib/                    # Utilities and services
├── actions/                # Server Actions
└── docs/                   # Documentation
```

## Documentation

- [User Guides](user-guides/) - How to use features
- [API Reference](api/) - Server actions and endpoints
- [Development Guide](developer/) - Contributing and setup
- [Architecture](architecture/) - System design and database schema

## Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
OPENROUTER_API_KEY=your-openrouter-key
OPENAI_API_KEY=your-openai-key
```

## Common Issues

### Storage Upload Problems

If you encounter storage issues:

1. **Bucket not found**: Run storage setup in Supabase Dashboard
2. **Foreign key error**: Check user sync triggers
3. **Permission denied**: Verify RLS policies

See [Troubleshooting Guide](#troubleshooting) for detailed solutions.

## Troubleshooting

### Database Issues

```bash
# Reset database (careful - deletes all data)
npm run db:cleanup

# Apply RLS policies
npm run db:apply-rls

# Fix all RLS issues
npm run db:fix-all-rls
```

### Storage Issues

1. **Create documents bucket** in Supabase Storage
2. **Configure RLS policies** for user access
3. **Test upload** with diagnostic script

### Authentication Issues

- Check environment variables match your Supabase project
- Verify cookies are enabled in browser
- Check RLS policies on auth tables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the development guidelines
4. Submit a pull request

## License

MIT License - see LICENSE file for details.