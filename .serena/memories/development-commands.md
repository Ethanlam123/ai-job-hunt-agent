# Development Commands - AI Job Hunt Agent

## Essential Commands

### Development Workflow
```bash
# Start development server
npm run dev              # Start dev server on http://localhost:3000

# Build and deployment
npm run build            # Build for production
npm run start            # Start production server
npm run analyze          # Analyze bundle size
```

### Code Quality & Testing
```bash
# Linting and formatting
npm run lint             # Run ESLint
npm run lint:strict      # Run ESLint with strict rules (max-warnings=0)
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes
npm run type-check       # Run TypeScript type checking

# Testing
npm run test             # Run Jest test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run Playwright end-to-end tests
npm run test:e2e:ui      # Run E2E tests with UI
npm run test:integration # Run integration tests only
npm run test:security    # Run security tests only
```

### Database Management
```bash
# Database setup (choose one)
./scripts/setup-database.sh        # Automated setup with MCP (easiest)
./scripts/setup-database-sql.sh     # Automated setup without MCP
npm run db:push                     # Traditional Drizzle setup

# Schema management
npm run db:generate                 # Generate Drizzle migration files
npm run db:migrate                  # Run database migrations
npm run db:studio                   # Open Drizzle Studio

# Row Level Security (CRITICAL)
npm run db:apply-rls                # Apply RLS policies (REQUIRED)
npm run db:fix-all-rls              # Fix all RLS policies
npm run db:fix-rls                  # Fix documents table RLS

# Database maintenance
npm run db:cleanup                  # Clean and reset database
npm run db:reset                    # Full reset: cleanup + push + apply-rls
```

### Documentation & Utilities
```bash
# Documentation generation
npm run docs:generate               # Generate all documentation
npm run docs:api                    # Generate API documentation
npm run docs:components             # Generate component documentation
npm run docs:database               # Generate database documentation
npm run docs:coverage               # Check documentation coverage
npm run docs:build                  # Generate docs + coverage report

# Development utilities
npm run clean                       # Clean .next, out, and node_modules/.cache
npm run setup                       # Run setup script
```

## Critical Setup Sequence

For new development environments:

1. **Install dependencies**: `npm install`
2. **Environment setup**: `cp .env.example .env` and configure
3. **Database setup**: Choose one method from above
4. **Apply RLS policies**: `npm run db:apply-rls` (REQUIRED)
5. **Start development**: `npm run dev`

## Common Troubleshooting Commands

### "Tenant or user not found" Error
```bash
npm run db:apply-rls && npm run db:fix-all-rls
```

### Database Connection Issues
```bash
# Alternative setup methods if npm run db:push fails
./scripts/setup-database-sql.sh     # Uses psql directly
# Or copy scripts/database-schema.sql to Supabase SQL Editor
```

### Development Diagnostics
```bash
# Test storage upload functionality
node scripts/test-storage-upload.js

# Check database connection and RLS policies
npm run db:studio
```

## Testing Commands by Category

### Unit Tests
- Run with: `npm run test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

### Integration Tests
- Database operations, connection pooling, transactions
- Run with: `npm run test:integration`

### E2E Tests
- Complete user workflows (registration, document upload, CV analysis)
- Run with: `npm run test:e2e` or `npm run test:e2e:ui`

### Security Tests
- Authentication bypass prevention, data leakage detection
- Run with: `npm run test:security`

## Code Quality Standards

### TypeScript Configuration
- Strict mode enabled (`tsconfig.strict.json`)
- Path aliases: `@/*` maps to `./src/*`
- No implicit any, strict null checks

### ESLint Configuration
- Uses Next.js recommended configs
- Core Web Vitals enabled
- TypeScript rules enabled
- Global ignores: `.next/`, `out/`, `build/`

### Prettier Configuration
- Strict formatting rules (`.prettierrc.strict.json`)
- Consistent code style across project

## Required Environment Variables

Key variables that must be configured in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (development only)
- `OPENROUTER_API_KEY` - LLM API key
- `OPENAI_API_KEY` - Embeddings API key
- `DATABASE_URL` - Database connection string (optional)