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
    ssl: { rejectUnauthorized: false } // Add SSL configuration
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