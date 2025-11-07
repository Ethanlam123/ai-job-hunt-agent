#!/bin/bash

# =============================================================================
# Database Setup Script for AI Job Hunt Agent
# =============================================================================
#
# This script sets up the complete database schema when Drizzle connection
# issues occur. It uses the same approach that successfully resolved the
# connection timeout problems.
#
# Usage: ./scripts/setup-database.sh
# Prerequisites: Supabase MCP tools must be available
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

# Function to check if MCP tools are available
check_mcp_tools() {
    print_status "Checking if Supabase MCP tools are available..."

    # Try to list extensions to test connection
    if ! mcp__supabase__list_extensions > /dev/null 2>&1; then
        print_error "Supabase MCP tools are not available or not connected."
        print_error "Please ensure:"
        print_error "1. MCP server is running"
        print_error "2. Supabase connection is authenticated"
        print_error "3. Environment variables are properly set"
        exit 1
    fi

    print_success "MCP tools are available and connected!"
}

# Function to check if database already has tables
check_existing_tables() {
    print_status "Checking existing database tables..."

    local table_count=$(mcp__supabase__list_tables schemas='["public"]' | jq -r '. | length' 2>/dev/null || echo "0")

    if [ "$table_count" -gt 0 ]; then
        print_warning "Found $table_count tables already in the database."
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

# Function to apply the database schema
apply_database_schema() {
    print_status "Creating database schema..."

    # Read the migration SQL from file
    local migration_file="$(dirname "$0")/../database-schema.sql"

    # If schema file doesn't exist, use inline schema
    if [ ! -f "$migration_file" ]; then
        print_status "Using inline schema definition..."
        apply_inline_schema
    else
        print_status "Using schema from file: $migration_file"
        apply_schema_from_file "$migration_file"
    fi
}

# Function to apply schema from inline definition
apply_inline_schema() {
    local sql="
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS \"vector\";

-- Create users table (managed by Supabase Auth but we need it for relationships)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_stage VARCHAR(50),
  state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
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
CREATE TABLE IF NOT EXISTS cv_embeddings (
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
CREATE TABLE IF NOT EXISTS job_descriptions (
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
CREATE TABLE IF NOT EXISTS tasks (
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
CREATE TABLE IF NOT EXISTS cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
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
CREATE TABLE IF NOT EXISTS skill_gaps (
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
CREATE TABLE IF NOT EXISTS user_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create llm_calls table
CREATE TABLE IF NOT EXISTS llm_calls (
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
CREATE TABLE IF NOT EXISTS interview_questions (
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
CREATE TABLE IF NOT EXISTS cover_letters (
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

    if mcp__supabase__apply_migration name="setup_database_schema" query="$sql"; then
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
    local table_count=$(mcp__supabase__list_tables schemas='["public"]' | jq -r '. | length' 2>/dev/null || echo "0")

    if [ "$table_count" -eq 15 ]; then
        print_success "All 15 tables created successfully!"
    else
        print_warning "Expected 15 tables, but found $table_count"
        print_status "Listing created tables:"
        mcp__supabase__list_tables schemas='["public"]' | jq -r '.[].name' 2>/dev/null || echo "Could not list tables"
    fi

    # Check vector extension
    local vector_extension=$(mcp__supabase__list_extensions | jq -r '.[] | select(.name=="vector") | .name' 2>/dev/null || echo "")

    if [ "$vector_extension" == "vector" ]; then
        print_success "Vector extension is enabled!"
    else
        print_warning "Vector extension might not be enabled properly"
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
    echo "3. Consider setting up Row Level Security (RLS) policies"
    echo
    print_status "To check your database anytime, run:"
    echo "  mcp__supabase__list_tables schemas='[\"public\"]'"
    echo
    print_status "For more information, see DATABASE_FIX.md"
}

# Main execution
main() {
    echo "=================================================="
    echo "  AI Job Hunt Agent - Database Setup Script"
    echo "=================================================="
    echo

    check_mcp_tools
    check_existing_tables
    apply_database_schema
    verify_setup
    show_next_steps
}

# Run the main function
main "$@"