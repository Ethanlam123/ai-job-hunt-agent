/**
 * Database Cleanup Script
 *
 * WARNING: This will DELETE ALL DATA from the database!
 * Only run this in development environments.
 */

import postgres from 'postgres'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...')
  console.log('⚠️  WARNING: This will DELETE ALL DATA!')
  console.log('')

  const sql = postgres(connectionString, { prepare: false })

  try {
    // Disable RLS temporarily for cleanup
    console.log('1️⃣ Disabling Row Level Security...')
    await sql`ALTER TABLE sessions DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE messages DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE documents DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE cv_embeddings DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE job_descriptions DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE tasks DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE cache DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE approvals DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE skill_gaps DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE user_metrics DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE llm_calls DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE interview_questions DISABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE cover_letters DISABLE ROW LEVEL SECURITY`
    console.log('✅ RLS disabled')
    console.log('')

    // Delete data (order matters due to foreign key constraints!)
    console.log('2️⃣ Deleting data from tables...')

    const deletions = [
      { table: 'messages', query: sql`DELETE FROM messages` },
      { table: 'cv_embeddings', query: sql`DELETE FROM cv_embeddings` },
      { table: 'interview_questions', query: sql`DELETE FROM interview_questions` },
      { table: 'cover_letters', query: sql`DELETE FROM cover_letters` },
      { table: 'approvals', query: sql`DELETE FROM approvals` },
      { table: 'skill_gaps', query: sql`DELETE FROM skill_gaps` },
      { table: 'tasks', query: sql`DELETE FROM tasks` },
      { table: 'job_descriptions', query: sql`DELETE FROM job_descriptions` },
      { table: 'documents', query: sql`DELETE FROM documents` },
      { table: 'sessions', query: sql`DELETE FROM sessions` },
      { table: 'user_metrics', query: sql`DELETE FROM user_metrics` },
      { table: 'llm_calls', query: sql`DELETE FROM llm_calls` },
      { table: 'cache', query: sql`DELETE FROM cache` },
      { table: 'rate_limits', query: sql`DELETE FROM rate_limits` },
    ]

    for (const { table, query } of deletions) {
      const result = await query
      console.log(`   ✓ Deleted from ${table}: ${result.count} rows`)
    }
    console.log('✅ All data deleted')
    console.log('')

    // Re-enable RLS
    console.log('3️⃣ Re-enabling Row Level Security...')
    await sql`ALTER TABLE sessions ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE messages ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE documents ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE cv_embeddings ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE cache ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE approvals ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE skill_gaps ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE llm_calls ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY`
    await sql`ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY`
    console.log('✅ RLS re-enabled')
    console.log('')

    console.log('✨ Database cleanup completed successfully!')
    console.log('')
    console.log('📊 All stats should now show 0 on the dashboard.')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await sql.end()
  }
}

// Run cleanup
cleanupDatabase()
  .then(() => {
    console.log('👋 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
