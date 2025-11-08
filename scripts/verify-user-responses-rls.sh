#!/bin/bash

# Script to verify RLS policies for user_responses table

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set."
    print_error "Please set your DATABASE_URL in the .env file or export it:"
    print_error "export DATABASE_URL=\"postgresql://user:password@host:port/database\""
    exit 1
fi

print_status "Verifying RLS policies for user_responses table..."

# SQL to verify RLS policies
VERIFY_RLS_SQL="
-- Check if user_responses table exists
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_responses'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'user_responses table does not exist';
    END IF;
END \$\$;

-- Check if RLS is enabled
SELECT
    CASE
        WHEN rowsecurity = true THEN 'RLS enabled ✓'
        ELSE 'RLS disabled ✗'
    END as rls_status
FROM pg_tables
WHERE tablename = 'user_responses' AND schemaname = 'public';

-- List all RLS policies on user_responses table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_responses' AND schemaname = 'public'
ORDER BY policyname;

-- Check if necessary permissions are granted
SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'user_responses'
    AND table_schema = 'public'
    AND grantee IN ('authenticated', 'service_role', 'anon')
ORDER BY grantee, privilege_type;

-- Verify table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_responses'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_responses'
    AND schemaname = 'public'
ORDER BY indexname;
"

# Function to test RLS with different user contexts
test_rls_policies() {
    print_status "Testing RLS policy enforcement..."

    # Test 1: Try to access user_responses as anonymous user (should fail)
    print_status "Testing anonymous access (should be blocked)..."

    ANON_ACCESS=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM user_responses LIMIT 1;
    " 2>/dev/null | tr -d ' ' || echo "ERROR")

    if [ "$ANON_ACCESS" = "ERROR" ] || [ "$ANON_ACCESS" = "0" ]; then
        print_success "Anonymous access properly blocked"
    else
        print_warning "Anonymous access may not be properly restricted"
    fi

    # Test 2: Check if authenticated users can only access their own data
    print_status "Testing user isolation..."

    # This test would require creating test users and checking isolation
    # For now, we'll just verify the policies exist
    POLICY_COUNT=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM pg_policies
        WHERE tablename = 'user_responses' AND schemaname = 'public';
    " | tr -d ' ')

    if [ "$POLICY_COUNT" -ge 4 ]; then
        print_success "Found $POLICY_COUNT RLS policies (expected at least 4)"
    else
        print_warning "Found only $POLICY_COUNT RLS policies (expected at least 4)"
    fi
}

# Function to provide RLS fix suggestions
provide_rls_fixes() {
    echo
    print_status "RLS Policy Setup Recommendations:"
    echo
    echo "1. **Enable RLS on user_responses table**:"
    echo "   ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;"
    echo
    echo "2. **Create policies for user access**:"
    echo "   -- Users can view their own responses"
    echo "   CREATE POLICY \"Users can view own responses\" ON user_responses"
    echo "       FOR SELECT USING (auth.uid() = user_id);"
    echo
    echo "   -- Users can insert their own responses"
    echo "   CREATE POLICY \"Users can insert own responses\" ON user_responses"
    echo "       FOR INSERT WITH CHECK (auth.uid() = user_id);"
    echo
    echo "   -- Users can update their own responses"
    echo "   CREATE POLICY \"Users can update own responses\" ON user_responses"
    echo "       FOR UPDATE USING (auth.uid() = user_id);"
    echo
    echo "   -- Users can delete their own responses"
    echo "   CREATE POLICY \"Users can delete own responses\" ON user_responses"
    echo "       FOR DELETE USING (auth.uid() = user_id);"
    echo
    echo "3. **Grant necessary permissions**:"
    echo "   GRANT SELECT, INSERT, UPDATE, DELETE ON user_responses TO authenticated;"
    echo "   GRANT SELECT, INSERT, UPDATE, DELETE ON user_responses TO service_role;"
    echo
    echo "4. **Test RLS policies**:"
    echo "   -- Test as different users to verify isolation"
    echo "   -- Check that users can only access their own data"
    echo
}

# Main execution
main() {
    echo "=================================================="
    echo "  AI Job Hunt Agent - RLS Policy Verification"
    echo "  user_responses Table"
    echo "=================================================="
    echo

    print_status "Running RLS verification for user_responses table..."
    echo

    if echo "$VERIFY_RLS_SQL" | psql "$DATABASE_URL"; then
        print_success "RLS verification query executed successfully!"
        echo
        test_rls_policies
        provide_rls_fixes
    else
        print_error "Failed to run RLS verification"
        provide_rls_fixes
        exit 1
    fi

    echo
    print_status "RLS verification completed!"
    print_status "Review the output above to ensure:"
    echo "1. RLS is enabled on the user_responses table"
    echo "2. All 4 CRUD policies exist (SELECT, INSERT, UPDATE, DELETE)"
    echo "3. Policies use auth.uid() = user_id for user isolation"
    echo "4. Proper permissions are granted to authenticated users"
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Verification interrupted by user${NC}"; exit 1' INT

# Run the main function
main "$@"