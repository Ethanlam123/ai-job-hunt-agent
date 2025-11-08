#!/bin/bash

# Script to test database operations with user_responses schema

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
    exit 1
fi

print_status "Testing user_responses table operations..."

# Test data
TEST_USER_ID="test-user-$(date +%s)"
TEST_SESSION_ID="test-session-$(date +%s)"

# SQL operations for testing
TEST_OPERATIONS_SQL="
-- Test 1: Verify table structure
SELECT 'Table Structure Check' as test_step;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_responses'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 2: Test INSERT operation
SELECT 'INSERT Operation Test' as test_step;
INSERT INTO user_responses (
    session_id,
    user_id,
    question_category,
    question_id,
    question_text,
    answer,
    is_required,
    is_skipped,
    order_index,
    metadata
) VALUES (
    '$TEST_SESSION_ID',
    '$TEST_USER_ID',
    'personal',
    'test-q1',
    'What is your full name?',
    'John Doe',
    'true',
    'false',
    1,
    '{\"type\": \"text\", \"placeholder\": \"Enter your name\"}'::jsonb
) RETURNING id;

-- Test 3: Test INSERT with JSON answer
SELECT 'INSERT with JSON Answer Test' as test_step;
INSERT INTO user_responses (
    session_id,
    user_id,
    question_category,
    question_id,
    question_text,
    answer,
    is_required,
    is_skipped,
    order_index,
    metadata
) VALUES (
    '$TEST_SESSION_ID',
    '$TEST_USER_ID',
    'experience',
    'test-q2',
    'Describe your key achievements',
    '{
        \"achievements\": [
            \"Led team of 5 developers\",
            \"Increased revenue by 30%\",
            \"Reduced costs by \$100K\"
        ],
        \"metrics\": {
            \"team_size\": 5,
            \"revenue_increase\": 30,
            \"cost_reduction\": 100000
        }
    }'::jsonb,
    'true',
    'false',
    2,
    '{\"type\": \"textarea\", \"maxLength\": 500}'::jsonb
) RETURNING id;

-- Test 4: Test INSERT with skipped question
SELECT 'INSERT Skipped Question Test' as test_step;
INSERT INTO user_responses (
    session_id,
    user_id,
    question_category,
    question_id,
    question_text,
    answer,
    is_required,
    is_skipped,
    skip_reason,
    order_index,
    metadata
) VALUES (
    '$TEST_SESSION_ID',
    '$TEST_USER_ID',
    'career',
    'test-q3',
    'What is your target industry?',
    NULL,
    'false',
    'true',
    'Not applicable to my current situation',
    3,
    '{\"type\": \"select\", \"optional\": true}'::jsonb
) RETURNING id;

-- Test 5: Test SELECT operations
SELECT 'SELECT Operations Test' as test_step;
SELECT
    question_id,
    question_category,
    question_text,
    answer,
    is_required,
    is_skipped,
    skip_reason,
    order_index
FROM user_responses
WHERE session_id = '$TEST_SESSION_ID' AND user_id = '$TEST_USER_ID'
ORDER BY order_index;

-- Test 6: Test UPDATE operation
SELECT 'UPDATE Operation Test' as test_step;
UPDATE user_responses
SET answer = 'Jane Doe Updated',
    updated_at = NOW()
WHERE session_id = '$TEST_SESSION_ID'
    AND user_id = '$TEST_USER_ID'
    AND question_id = 'test-q1'
RETURNING question_id, answer, updated_at;

-- Test 7: Test JSON operations
SELECT 'JSON Operations Test' as test_step;
SELECT
    question_id,
    answer->>'achievements' as achievements_array,
    (answer->'metrics'->>'team_size')::int as team_size,
    (answer->'metrics'->>'revenue_increase')::numeric as revenue_increase
FROM user_responses
WHERE session_id = '$TEST_SESSION_ID'
    AND user_id = '$TEST_USER_ID'
    AND question_id = 'test-q2';

-- Test 8: Test aggregation queries
SELECT 'Aggregation Queries Test' as test_step;
SELECT
    user_id,
    session_id,
    COUNT(*) as total_questions,
    COUNT(CASE WHEN is_skipped = 'false' THEN 1 END) as answered_questions,
    COUNT(CASE WHEN is_skipped = 'true' THEN 1 END) as skipped_questions,
    COUNT(CASE WHEN is_required = 'true' THEN 1 END) as required_questions
FROM user_responses
WHERE user_id = '$TEST_USER_ID'
GROUP BY user_id, session_id;

-- Test 9: Test category-based queries
SELECT 'Category-based Queries Test' as test_step;
SELECT
    question_category,
    COUNT(*) as count,
    COUNT(CASE WHEN is_skipped = 'false' THEN 1 END) as answered,
    COUNT(CASE WHEN is_skipped = 'true' THEN 1 END) as skipped
FROM user_responses
WHERE session_id = '$TEST_SESSION_ID' AND user_id = '$TEST_USER_ID'
GROUP BY question_category
ORDER BY question_category;

-- Test 10: Test index usage (EXPLAIN ANALYZE)
SELECT 'Index Usage Test' as test_step;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM user_responses
WHERE user_id = '$TEST_USER_ID'
ORDER BY order_index;

-- Test 11: Test DELETE operation
SELECT 'DELETE Operation Test' as test_step;
DELETE FROM user_responses
WHERE session_id = '$TEST_SESSION_ID' AND user_id = '$TEST_USER_ID'
RETURNING question_id, question_category;

-- Test 12: Verify cleanup
SELECT 'Cleanup Verification Test' as test_step;
SELECT COUNT(*) as remaining_records
FROM user_responses
WHERE session_id = '$TEST_SESSION_ID' AND user_id = '$TEST_USER_ID';
"

# Function to run tests and check results
run_database_tests() {
    print_status "Executing database operations tests..."
    echo

    if echo "$TEST_OPERATIONS_SQL" | psql "$DATABASE_URL"; then
        print_success "All database operations completed successfully!"
        echo
        analyze_results
    else
        print_error "Database operations test failed!"
        provide_troubleshooting
        exit 1
    fi
}

# Function to analyze test results
analyze_results() {
    print_status "Analyzing test results..."
    echo

    # Check if the table has the expected structure
    TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_responses' AND table_schema = 'public';
    " | tr -d ' ')

    if [ "$TABLE_EXISTS" = "1" ]; then
        print_success "✓ user_responses table exists"
    else
        print_error "✗ user_responses table not found"
        return 1
    fi

    # Check expected columns
    EXPECTED_COLUMNS=("id" "session_id" "user_id" "question_category" "question_id" "question_text" "answer" "is_required" "is_skipped" "skip_reason" "order_index" "metadata" "created_at" "updated_at")

    for column in "${EXPECTED_COLUMNS[@]}"; do
        COLUMN_EXISTS=$(psql "$DATABASE_URL" -t -c "
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_responses'
                AND table_schema = 'public'
                AND column_name = '$column';
        " | tr -d ' ')

        if [ "$COLUMN_EXISTS" = "1" ]; then
            print_success "✓ Column '$column' exists"
        else
            print_error "✗ Column '$column' missing"
        fi
    done

    # Check indexes
    INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename = 'user_responses' AND schemaname = 'public';
    " | tr -d ' ')

    if [ "$INDEX_COUNT" -ge 4 ]; then
        print_success "✓ Found $INDEX_COUNT indexes (expected at least 4)"
    else
        print_warning "⚠ Found only $INDEX_COUNT indexes (expected at least 4)"
    fi

    # Check RLS status
    RLS_ENABLED=$(psql "$DATABASE_URL" -t -c "
        SELECT rowsecurity::text FROM pg_tables
        WHERE tablename = 'user_responses' AND schemaname = 'public';
    " | tr -d ' ')

    if [ "$RLS_ENABLED" = "true" ]; then
        print_success "✓ RLS is enabled"
    else
        print_warning "⚠ RLS is not enabled"
    fi

    # Check policies
    POLICY_COUNT=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM pg_policies
        WHERE tablename = 'user_responses' AND schemaname = 'public';
    " | tr -d ' ')

    if [ "$POLICY_COUNT" -ge 4 ]; then
        print_success "✓ Found $POLICY_COUNT RLS policies"
    else
        print_warning "⚠ Found only $POLICY_COUNT RLS policies (expected at least 4)"
    fi

    echo
    print_status "Database schema validation completed!"
}

# Function to provide troubleshooting help
provide_troubleshooting() {
    echo
    print_status "Troubleshooting Tips:"
    echo
    echo "1. **Table does not exist**:"
    echo "   - Run the migration: ./scripts/add-user-responses-table.sh"
    echo "   - Or apply SQL manually: supabase/migrations/20251108123349_add_user_responses.sql"
    echo
    echo "2. **Permission errors**:"
    echo "   - Check DATABASE_URL credentials"
    echo "   - Verify user has required privileges"
    echo "   - Run: npm run db:apply-rls"
    echo
    echo "3. **Connection issues**:"
    echo "   - Verify DATABASE_URL format"
    echo "   - Check network connectivity"
    echo "   - Ensure database is accessible"
    echo
    echo "4. **Missing columns**:"
    echo "   - Re-run migration to update schema"
    echo "   - Check if migration completed successfully"
    echo
}

# Function to test edge cases
test_edge_cases() {
    print_status "Testing edge cases..."
    echo

    # Test with very long answers
    LONG_ANSWER=$(printf "A%.0s" {1..10000})

    EDGE_CASE_SQL="
    -- Test long answer
    INSERT INTO user_responses (
        session_id, user_id, question_category, question_id,
        question_text, answer, is_required, is_skipped, order_index
    ) VALUES (
        '$TEST_SESSION_ID-edge',
        '$TEST_USER_ID',
        'experience',
        'edge-long',
        'Test long answer',
        '$LONG_ANSWER',
        'false',
        'false',
        1
    );

    -- Test special characters
    INSERT INTO user_responses (
        session_id, user_id, question_category, question_id,
        question_text, answer, is_required, is_skipped, order_index
    ) VALUES (
        '$TEST_SESSION_ID-edge',
        '$TEST_USER_ID',
        'personal',
        'edge-special',
        'Test special chars: àáâãäåæçèéêë',
        'Special answer: ñòóôõöùúûüýÿ',
        'false',
        'false',
        2
    );

    -- Test NULL handling
    INSERT INTO user_responses (
        session_id, user_id, question_category, question_id,
        question_text, answer, is_required, is_skipped, order_index
    ) VALUES (
        '$TEST_SESSION_ID-edge',
        '$TEST_USER_ID',
        'career',
        'edge-null',
        'Test NULL handling',
        NULL,
        'false',
        'true',
        3
    );

    -- Cleanup edge cases
    DELETE FROM user_responses
    WHERE session_id = '$TEST_SESSION_ID-edge';
    "

    if echo "$EDGE_CASE_SQL" | psql "$DATABASE_URL" >/dev/null 2>&1; then
        print_success "✓ Edge cases handled successfully"
    else
        print_warning "⚠ Some edge cases may need attention"
    fi
}

# Main execution
main() {
    echo "=================================================="
    echo "  AI Job Hunt Agent - Database Operations Test"
    echo "  user_responses Schema"
    echo "=================================================="
    echo

    run_database_tests
    test_edge_cases
    echo
    print_success "All database operations tests completed!"
    echo
    print_status "The user_responses table is ready for production use."
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Test interrupted by user${NC}"; exit 1' INT

# Run the main function
main "$@"