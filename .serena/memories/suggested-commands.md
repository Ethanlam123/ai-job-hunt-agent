# Essential Commands - AI Job Hunt Agent

## Daily Development Commands

### Start Working
```bash
# Start development server
npm run dev

# Open another terminal for database management
npm run db:studio    # Optional: Visual database interface
```

### Code Quality (Run Before Committing)
```bash
# Complete code quality check
npm run lint:strict && npm run type-check && npm run format:check && npm run test

# Individual checks
npm run lint         # Check for linting issues
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
npm run test         # Run all tests
```

## Database Management Commands

### Initial Setup (One-time)
```bash
# Choose ONE method for database setup:
./scripts/setup-database.sh        # Easiest: MCP-powered setup
./scripts/setup-database-sql.sh     # Alternative: SQL script setup
npm run db:push                     # Traditional: Drizzle setup

# CRITICAL: Apply RLS policies after setup
npm run db:apply-rls
```

### Ongoing Database Operations
```bash
# Schema management
npm run db:generate    # Generate migration files
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio (visual interface)

# Maintenance
npm run db:cleanup     # Clean and reset database
npm run db:reset       # Full reset: cleanup + push + apply-rls
npm run db:fix-all-rls # Fix all RLS policies
```

## Testing Commands

### Run Tests Based on Your Changes
```bash
# All tests
npm run test

# Specific test types
npm run test:integration  # Database and API integration
npm run test:e2e         # End-to-end user workflows
npm run test:security    # Security and authentication
npm run test:coverage    # Test coverage report
```

### Development Testing
```bash
npm run test:watch       # Run tests in watch mode
npm run test:e2e:ui      # E2E tests with visual interface
```

## Build & Deployment

### Production Build
```bash
npm run build        # Build for production
npm run start        # Start production server
npm run analyze      # Analyze bundle size
```

### Before Deployment Checklist
```bash
# Complete pre-deployment check
npm run clean       # Clean build cache
npm run lint:strict # Zero warnings
npm run type-check  # No type errors
npm run test        # All tests pass
npm run build       # Build succeeds
```

## Troubleshooting Commands

### "Tenant or user not found" Error
```bash
# Quick fix for RLS issues
npm run db:apply-rls && npm run db:fix-all-rls
```

### Database Connection Issues
```bash
# Test database connection
npm run db:studio

# Alternative setup if Drizzle fails
./scripts/setup-database-sql.sh
```

### File Upload Issues
```bash
# Test storage functionality
node scripts/test-storage-upload.js
```

### Performance Issues
```bash
# Clean and rebuild
npm run clean
npm run build
```

## Documentation Commands

### Generate Documentation
```bash
npm run docs:generate    # Generate all documentation
npm run docs:api         # API documentation
npm run docs:components  # Component documentation
npm run docs:database    # Database documentation
npm run docs:coverage    # Documentation coverage
```

## Development Environment Setup

### New Environment Setup
```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Database setup (choose one)
./scripts/setup-database.sh && npm run db:apply-rls

# 4. Start development
npm run dev
```

### Environment Variables Check
```bash
# Verify required environment variables are set
env | grep -E "(SUPABASE|OPENROUTER|OPENAI|DATABASE_URL)"
```

## Git Workflow Commands

### Pre-commit Checklist
```bash
# Before any commit, run:
npm run lint:strict && npm run type-check && npm run format:check && npm run test
```

### Git Operations
```bash
# Check status
git status

# Add and commit
git add .
git commit -m "feat: add new feature"

# Push changes
git push origin main
```

## System Utilities (macOS/Darwin)

### File Operations
```bash
# Find files (better than find)
fd "pattern"               # Search for files
rg "pattern"               # Search text in files

# Directory navigation
ls -la                     # List files with details
tree                       # Directory tree view
```

### Process Management
```bash
# Check running processes
ps aux | grep node         # Find Node processes
lsof -i :3000             # Check what's using port 3000

# Kill processes
kill -9 <PID>             # Kill process by ID
pkill -f "npm run dev"    # Kill dev server
```

### Network Utilities
```bash
# Check network connectivity
ping google.com           # Test internet connection
nslookup api.openrouter.ai  # Check DNS resolution
```

## Advanced Development Commands

### Advanced Database Operations
```bash
# Direct database access (if DATABASE_URL is set)
psql $DATABASE_URL        # Connect to database directly

# Check database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('users').select('*').then(console.log);
"
```

### Performance Monitoring
```bash
# Check Node.js memory usage
node --inspect app.js     # Enable debugging
node --max-old-space-size=4096 app.js  # Increase memory limit

# Bundle analysis
npm run analyze           # Analyze webpack bundle
```

### Security Checks
```bash
# Audit dependencies
npm audit                 # Check for security vulnerabilities
npm audit fix             # Auto-fix vulnerabilities

# Check environment file security
ls -la .env*              # Check file permissions
```

## Quick Reference Commands

### Most Used Commands (Daily)
```bash
npm run dev               # Start development
npm run lint:fix          # Fix linting issues
npm run format            # Format code
npm run test              # Run tests
npm run db:studio         # Database interface
```

### Before Any Commit
```bash
npm run lint:strict && npm run type-check && npm run test
```

### Complete Reset (If Needed)
```bash
npm run db:reset          # Reset database
npm run clean             # Clean build cache
rm -rf node_modules       # Remove dependencies
npm install               # Reinstall dependencies
```

## Emergency Commands

### If Nothing Works
```bash
# Complete environment reset
npm run db:cleanup        # Clean database
npm run clean             # Clean build cache
git clean -fd            # Remove untracked files
git reset --hard HEAD    # Reset to last commit
npm install              # Reinstall dependencies
npm run db:reset         # Reset database
npm run dev              # Start fresh
```

### Database Emergency
```bash
# If database is corrupted
npm run db:cleanup
# Then use one of the setup methods from Initial Setup section
```

These commands cover the essential day-to-day development workflow for the AI Job Hunt Agent project.