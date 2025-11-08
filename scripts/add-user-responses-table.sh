#!/bin/bash

# Script to add user_responses table to existing database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set."
    exit 1
fi

print_status "Adding user_responses table to database..."

# Read and execute the migration
SQL_CONTENT=$(cat supabase/migrations/20251108123349_add_user_responses.sql)

if echo "$SQL_CONTENT" | psql "$DATABASE_URL"; then
    print_success "user_responses table created successfully!"
else
    print_error "Failed to create user_responses table"
    exit 1
fi

# Verify the table was created
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_responses';
" | tr -d ' ')

if [ "$TABLE_EXISTS" == "1" ]; then
    print_success "user_responses table verified!"
else
    print_error "user_responses table was not created properly"
    exit 1
fi

print_success "Migration completed successfully!"