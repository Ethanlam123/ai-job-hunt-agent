import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  })

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), 'src/lib/db/migrations/0001_update_interview_questions.sql'),
      'utf-8'
    )

    console.log('Running migration...')
    await pool.query(migrationSQL)
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
