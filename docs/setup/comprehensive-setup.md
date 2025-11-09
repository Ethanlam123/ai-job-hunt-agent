# Comprehensive Setup Guide

This guide provides step-by-step instructions for setting up the AI Job Hunt Agent development environment.

## Prerequisites

### Required Software

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (comes with Node.js)
- **Git**: For version control
- **PostgreSQL Client**: Optional (for manual database operations)

### Required Accounts & API Keys

1. **Supabase Account**
   - Create account at [supabase.com](https://supabase.com)
   - Enable pgvector extension for your project
   - Note your project URL and API keys

2. **OpenRouter API Key**
   - Create account at [openrouter.ai](https://openrouter.ai)
   - Generate API key from dashboard
   - Plan: Free tier available, paid for production

3. **OpenAI API Key**
   - Create account at [platform.openai.com](https://platform.openai.com)
   - Generate API key for embeddings
   - Required for text-embedding-3-small model

## Step 1: Project Setup

### 1.1 Clone the Repository

```bash
git clone <your-repository-url>
cd ai-job-hunt-agent
```

### 1.2 Install Dependencies

```bash
npm install
```

### 1.3 Environment Configuration

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database (optional, for Drizzle migrations)
DATABASE_URL=postgresql://postgres:[password]@db.your-project-id.supabase.co:5432/postgres

# AI Services
OPENROUTER_API_KEY=your-openrouter-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional: LangSmith for tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=job-hunt-agent
LANGCHAIN_API_KEY=your-langsmith-api-key

# Application Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 1.4 Environment Variables Explained

| Variable | Description | Required? |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection string | ❌ Optional |
| `OPENROUTER_API_KEY` | OpenRouter API key | ✅ Yes |
| `OPENAI_API_KEY` | OpenAI API key | ✅ Yes |
| `LANGCHAIN_API_KEY` | LangSmith tracing (optional) | ❌ Optional |

## Step 2: Database Setup

Choose ONE of the following setup methods:

### Option A: Automated Setup with Supabase MCP (Recommended)

**Prerequisites**: Supabase MCP tools configured

1. **Run Automated Setup Script**
   ```bash
   ./scripts/setup-database.sh
   ```

2. **Apply RLS Policies**
   ```bash
   npm run db:apply-rls
   ```

### Option B: Automated Setup without MCP

**Prerequisites**: PostgreSQL client tools (`psql`) installed

1. **Setup with psql**
   ```bash
   # Using environment variable
   export DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
   ./scripts/setup-database-sql.sh

   # Or using direct connection
   psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -f scripts/database-schema.sql
   ```

2. **Apply RLS Policies**
   ```bash
   psql $DATABASE_URL -f scripts/rls-policies.sql
   ```

### Option C: Manual Setup via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Navigate to your project
   - Open SQL Editor

2. **Create Schema**
   - Copy contents of `scripts/database-schema.sql`
   - Paste into SQL Editor
   - Execute the script

3. **Apply RLS Policies**
   - Copy contents of `scripts/rls-policies.sql`
   - Paste into SQL Editor
   - Execute the script

### Option D: Traditional Drizzle Setup (Not Recommended)

```bash
npm run db:push      # Push schema to database
npm run db:apply-rls # Apply RLS policies
```

> ⚠️ **Warning**: This method may have connection issues with Supabase.

## Step 3: Verify Database Setup

### Check Tables Existence

```sql
-- Connect to your database and run:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'users', 'sessions', 'documents', 'cv_embeddings',
  'job_descriptions', 'tasks', 'skill_gaps', 'messages'
);
```

### Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## Step 4: Test the Application

### 4.1 Start Development Server

```bash
npm run dev
```

Application should be available at [http://localhost:3000](http://localhost:3000)

### 4.2 Create Test Account

1. Navigate to the application
2. Click "Sign Up"
3. Create a test account
4. Verify email (if required)

### 4.3 Test Core Features

1. **Document Upload**
   - Try uploading a PDF CV
   - Verify it appears in document list

2. **CV Analysis**
   - Select uploaded CV
   - Start CV analysis
   - Check analysis results

3. **Cover Letter Generation**
   - Upload job description
   - Generate cover letter
   - Review generated content

## Step 5: Troubleshooting

### Common Issues and Solutions

#### "Tenant or user not found" Error

**Symptoms**: Users get authentication errors after login

**Cause**: Mismatch between Supabase Auth users and application users table

**Solution**:
```bash
# Quick fix
npm run db:apply-rls && npm run db:fix-all-rls

# Manual fix via SQL Editor
-- Run contents of scripts/supabase-auth-user-sync.sql
```

#### Database Connection Issues

**Symptoms**: `npm run db:push` fails with connection errors

**Solutions**:
1. Use Option A, B, or C from Step 2
2. Check firewall settings
3. Verify DATABASE_URL format
4. Use Supabase Dashboard SQL Editor

#### File Upload Errors

**Symptoms**: Document uploads fail

**Solutions**:
1. Check file size limits (default 10MB)
2. Verify supported formats (PDF, DOCX, TXT)
3. Check Supabase Storage permissions
4. Ensure RLS policies allow file operations

#### AI Service Errors

**Symptoms**: LLM operations fail

**Solutions**:
1. Verify API keys are correct
2. Check OpenRouter account credits
3. Confirm OpenAI API access
4. Review rate limiting settings

### Debug Mode

Enable debug logging:

```bash
# Add to .env
DEBUG=true
LOG_LEVEL=debug

# Restart server
npm run dev
```

### Database Reset

If you need to completely reset the database:

```bash
# WARNING: This deletes all data
npm run db:cleanup

# Then repeat Step 2 setup
```

## Step 6: Production Configuration

### Environment Variables for Production

```bash
# Use production keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_anon_key
SUPABASE_SERVICE_ROLE_KEY=production_service_role_key

# Production AI keys
OPENROUTER_API_KEY=production_openrouter_key
OPENAI_API_KEY=production_openai_key

# Enable production features
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Security Best Practices

1. **Never commit `.env` files**
2. **Use environment-specific keys**
3. **Enable RLS policies**
4. **Monitor API usage**
5. **Set up rate limiting**
6. **Regular security audits**

### Performance Optimization

1. **Enable database caching**
2. **Configure CDN**
3. **Optimize images**
4. **Monitor Core Web Vitals**
5. **Set up error tracking**

## Step 7: Development Workflow

### Daily Development Commands

```bash
# Start development
npm run dev

# Database operations
npm run db:studio          # Open Drizzle Studio
npm run db:generate        # Generate migrations
npm run db:migrate         # Run migrations

# Code quality
npm run lint               # Run ESLint
npm run build             # Production build test
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Code Quality Checks

```bash
# Run all checks before committing
npm run lint
npm run build
npm run test  # if tests are available
```

## Step 8: Maintenance

### Regular Tasks

1. **Update dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Database maintenance**
   ```bash
   npm run db:studio  # Monitor database
   ```

3. **Monitor usage**
   - Check Supabase dashboard
   - Monitor OpenRouter usage
   - Review error logs

### Backup Strategy

1. **Database backups** - Enabled by Supabase
2. **File storage** - Supabase Storage backups
3. **Configuration** - Git repository
4. **Environment variables** - Secure storage

## Step 9: Additional Resources

### Documentation

- **[Architecture Overview](../architecture/system-overview.md)** - System design and components
- **[API Documentation](../api/server-actions.md)** - Server actions reference
- **[User Guides](../user-guides/)** - Feature-specific guides
- **[Developer Guide](../developer/)** - Development patterns

### Support

- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub discussions
- **Documentation**: Check existing docs first
- **Community**: Join community channels

### External Documentation

- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **LangChain Documentation**: [js.langchain.com](https://js.langchain.com)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)

## Verification Checklist

Before proceeding to development, verify:

- [ ] Environment variables configured correctly
- [ ] Database schema created successfully
- [ ] RLS policies applied
- [ ] Test account can register and login
- [ ] Document upload works
- [ ] CV analysis produces results
- [ ] No console errors in browser
- [ ] Development server runs without errors

Congratulations! Your AI Job Hunt Agent development environment is now set up and ready for development.