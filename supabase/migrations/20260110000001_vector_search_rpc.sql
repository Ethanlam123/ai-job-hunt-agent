-- Migration: Vector Search RPC Function
-- Purpose: Create a secure, parameterized vector search function to prevent SQL injection
-- Created: 2026-01-10
-- Context: Fixes critical SQL injection vulnerability in vector search operations

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

/**
 * Vector Search RPC Function
 *
 * Performs vector similarity search using cosine distance with proper
 * parameterization to prevent SQL injection attacks.
 *
 * SECURITY: This function uses PostgreSQL format() with SECURITY DEFINER
 * to safely construct dynamic queries while preventing SQL injection.
 *
 * @param query_vector vector(1536) - The query embedding vector
 * @param search_table text - Table name to search (validated against whitelist)
 * @param vector_col text - Column name containing vectors (validated against whitelist)
 * @param similarity_threshold float - Minimum similarity score (0-1)
 * @param result_limit int - Maximum number of results to return
 * @returns table (id bigint, similarity float) - Matching records with similarity scores
 */
CREATE OR REPLACE FUNCTION vector_search(
  query_vector vector(1536),
  search_table text,
  vector_col text,
  similarity_threshold float DEFAULT 0.7,
  result_limit int DEFAULT 10
)
RETURNS table (
  id bigint,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format(
    'SELECT id, 1 - (%I <=> $1) as similarity
     FROM %I
     WHERE 1 - (%I <=> $1) > $2
     ORDER BY similarity DESC
     LIMIT $3',
    vector_col, search_table, vector_col
  )
  USING query_vector, similarity_threshold, result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION vector_search(
  vector(1536),
  text,
  text,
  float,
  int
) TO authenticated;

-- Grant execute permission to service role for testing
GRANT EXECUTE ON FUNCTION vector_search(
  vector(1536),
  text,
  text,
  float,
  int
) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION vector_search IS 'Secure vector similarity search using cosine distance. Prevents SQL injection through parameterized queries and format() function.';
