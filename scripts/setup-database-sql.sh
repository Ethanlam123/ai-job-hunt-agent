#!/bin/bash

# =============================================================================
# Database Setup Script for AI Job Hunt Agent (MCP-Free Version)
# =============================================================================
#
# This script sets up the complete database schema using direct SQL commands
# when MCP tools are not available.
#
# Usage: ./scripts/setup-database-sql.sh
# Prerequisites: psql command line tool and proper DATABASE_URL
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if DATABASE_URL is set
check_database_url() {
    print_status "Checking DATABASE_URL environment variable..."

    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable is not set."
        print_error "Please set your DATABASE_URL in the .env file or export it:"
        print_error "export DATABASE_URL=\"postgresql://user:password@host:port/database\""
        exit 1
    fi

    print_success "DATABASE_URL is configured."
}

# Function to check if psql is available
check_psql() {
    print_status "Checking if psql is available..."

    if ! command -v psql &> /dev/null; then
        print_error "psql command not found. Please install PostgreSQL client tools:"
        print_error "- macOS: brew install postgresql"
        print_error "- Ubuntu: sudo apt-get install postgresql-client"
        print_error "- Windows: Download from PostgreSQL official website"
        exit 1
    fi

    print_success "psql is available."
}

# Function to test database connection
test_connection() {
    print_status "Testing database connection..."

    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        print_error "Cannot connect to database using DATABASE_URL"
        print_error "Please check your database credentials and network connection."
        exit 1
    fi

    print_success "Database connection successful!"
}

# Function to check existing tables
check_existing_tables() {
    print_status "Checking existing database tables..."

    local table_count=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " | tr -d ' ')

    if [ "$table_count" -gt 0 ]; then
        print_warning "Found $table_count tables already in the database."
        echo "Existing tables:"
        psql "$DATABASE_URL" -c "
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        " 2>/dev/null | sed '1d;$d' || echo "Could not list tables"

        read -p "Do you want to continue and potentially overwrite existing tables? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Database setup cancelled."
            exit 0
        fi
    else
        print_success "Database appears to be empty - proceeding with setup."
    fi
}

# Function to apply database schema
apply_database_schema() {
    print_status "Creating database schema..."

    # Create the complete SQL script
    local sql_script="
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS \"vector\";

-- Drop existing tables if they exist (cascade to handle dependencies)
DROP TABLE IF EXISTS cover_letters CASCADE;
DROP TABLE IF EXISTS interview_questions CASCADE;
DROP TABLE IF EXISTS llm_calls CASCADE;
DROP TABLE IF EXISTS user_metrics CASCADE;
DROP TABLE IF EXISTS skill_gaps CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS cache CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS job_descriptions CASCADE;
DROP TABLE IF EXISTS cv_embeddings CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (managed by Supabase Auth but we need it for relationships)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_stage VARCHAR(50),
  state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  document_type VARCHAR(50),
  original_filename VARCHAR(255),
  file_path VARCHAR(500),
  file_format VARCHAR(10),
  parsed_content JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cv_embeddings table
CREATE TABLE cv_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  section_type VARCHAR(50),
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_descriptions table
CREATE TABLE job_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  description TEXT,
  requirements JSONB,
  parsed_content JSONB,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  result JSONB,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create cache table
CREATE TABLE cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate_limits table
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create approvals table
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  original_content JSONB,
  proposed_content JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  decided_at TIMESTAMP WITH TIME ZONE
);

-- Create skill_gaps table
CREATE TABLE skill_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  importance VARCHAR(20),
  learning_resources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_metrics table
CREATE TABLE user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create llm_calls table
CREATE TABLE llm_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  prompt_tokens VARCHAR(20),
  completion_tokens VARCHAR(20),
  total_tokens VARCHAR(20),
  cost JSONB,
  duration VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create interview_questions table
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  job_description_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  question_type VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  question_text TEXT NOT NULL,
  expected_answer TEXT,
  evaluation_criteria JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  user_answer TEXT,
  evaluation_result JSONB,
  answered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cover_letters table
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cv_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  jd_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  version VARCHAR(10) NOT NULL DEFAULT '1',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"

    # Execute the SQL script
    if echo "$sql_script" | psql "$DATABASE_URL"; then
        print_success "Database schema applied successfully!"
    else
        print_error "Failed to apply database schema"
        exit 1
    fi
}

# Function to verify the setup
verify_setup() {
    print_status "Verifying database setup..."

    # Count tables
    local table_count=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " | tr -d ' ')

    if [ "$table_count" -eq 15 ]; then
        print_success "All 15 tables created successfully!"
    else
        print_warning "Expected 15 tables, but found $table_count"
        print_status "Listing created tables:"
        psql "$DATABASE_URL" -c "
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        " 2>/dev/null | sed '1d;$d' || echo "Could not list tables"
    fi

    # Check vector extension
    local vector_check=$(psql "$DATABASE_URL" -t -c "
        SELECT 1 FROM pg_extension WHERE extname = 'vector';
    " | tr -d ' ')

    if [ "$vector_check" == "1" ]; then
        print_success "Vector extension is enabled!"
    else
        print_warning "Vector extension might not be enabled properly"
        print_status "You may need to manually enable it: CREATE EXTENSION vector;"
    fi

    # Check vector column in cv_embeddings
    local vector_column=$(psql "$DATABASE_URL" -t -c "
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cv_embeddings' AND data_type = 'USER-DEFINED';
    " | tr -d ' ')

    if [ "$vector_column" == "1" ]; then
        print_success "Vector columns are properly configured!"
    else
        print_warning "Vector columns might not be properly configured"
    fi
}

# Function to show next steps
show_next_steps() {
    echo
    print_success "Database setup completed successfully!"
    echo
    print_status "Next steps:"
    echo "1. Verify your application can connect to the database"
    echo "2. Test the application features that use the database"
    echo "3. Consider setting up Row Level Security (RLS) policies with: npm run db:apply-rls"
    echo
    print_status "To check your database anytime, run:"
    echo "  psql \"\$DATABASE_URL\" -c \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';\""
    echo
    print_status "For more information, see DATABASE_FIX.md"
}

# Function to provide alternative setup methods
show_alternatives() {
    echo
    print_status "Alternative Database Setup Methods:"
    echo
    echo "1. **Supabase Dashboard**:"
    echo "   - Go to your Supabase project dashboard"
    echo "   - Use the SQL Editor to run the schema from scripts/database-schema.sql"
    echo
    echo "2. **MCP Tools** (if available):"
    echo "   - Use: ./scripts/setup-database.sh"
    echo
    echo "3. **Manual Drizzle** (if connection works):"
    echo "   - Use: npm run db:push"
    echo
}

# Main execution
main() {
    echo "=================================================="
    echo "  AI Job Hunt Agent - Database Setup Script"
    echo "  (MCP-Free Version)"
    echo "=================================================="
    echo

    check_database_url
    check_psql
    test_connection
    check_existing_tables
    apply_database_schema
    verify_setup
    show_next_steps
    show_alternatives
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Setup interrupted by user${NC}"; exit 1' INT

# Run the main function
main "$@"