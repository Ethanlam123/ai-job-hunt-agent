import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

async function runMigration() {
  // Parse DATABASE_URL to disable SSL
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }

  const dbUrl = new URL(DATABASE_URL)
  dbUrl.searchParams.append('sslmode', 'disable')

  const pool = new Pool({
    connectionString: dbUrl.toString()
  })

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), 'src/lib/db/migrations/0004_add_user_responses.sql'),
      'utf-8'
    )

    console.log('Running user responses migration...')
    await pool.query(migrationSQL)
    console.log('✅ User responses migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()