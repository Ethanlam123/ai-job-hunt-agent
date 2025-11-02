/**
 * Apply RLS Policies Script
 *
 * This script applies Row Level Security policies to the Supabase database.
 * Run this when you encounter RLS policy violations.
 */

import postgres from 'postgres'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
dotenv.config({ path: '.env' })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function applyRLSPolicies() {
  console.log('🔒 Applying RLS policies to database...')
  console.log('')

  const sql = postgres(connectionString!, { prepare: false })

  try {
    // Read the RLS migration file
    const rlsMigrationPath = join(process.cwd(), 'src/lib/db/migrations/0002_enable_rls.sql')
    const rlsSQL = readFileSync(rlsMigrationPath, 'utf-8')

    console.log('📄 Reading migration file: 0002_enable_rls.sql')

    // Split SQL into individual statements (separated by semicolons)
    const statements = rlsSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements`)
    console.log('')

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // Skip if it's just whitespace or comment
      if (!statement || statement.startsWith('--')) continue

      try {
        // Show which policy we're creating
        if (statement.includes('CREATE POLICY')) {
          const policyMatch = statement.match(/CREATE POLICY "([^"]+)"/)
          const policyName = policyMatch ? policyMatch[1] : 'unknown'
          console.log(`  ✓ Creating policy: ${policyName}`)
        } else if (statement.includes('ENABLE ROW LEVEL SECURITY')) {
          const tableMatch = statement.match(/ALTER TABLE (\w+)/)
          const tableName = tableMatch ? tableMatch[1] : 'unknown'
          console.log(`  ✓ Enabling RLS on: ${tableName}`)
        }

        await sql.unsafe(statement)
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists')) {
          console.log(`  ⚠ Skipped (already exists)`)
        } else {
          console.error(`  ❌ Error executing statement:`, error.message)
          console.error(`     Statement: ${statement.substring(0, 100)}...`)
        }
      }
    }

    console.log('')
    console.log('✅ RLS policies applied successfully!')
    console.log('')
    console.log('You can now:')
    console.log('1. Try uploading documents again')
    console.log('2. Run other operations that require RLS policies')

  } catch (error) {
    console.error('❌ Failed to apply RLS policies:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run the script
applyRLSPolicies()
