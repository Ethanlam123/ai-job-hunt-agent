import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Required environment variables are missing')
  process.exit(1)
}

async function createUserResponsesTable() {
  // Use service role client for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('Creating user_responses table...')

    // Read the migration SQL
    const migrationSQL = readFileSync(
      join(process.cwd(), 'src/lib/db/migrations/0004_add_user_responses.sql'),
      'utf-8'
    )

    // Execute the migration using SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('Error creating table:', error)

      // Try alternative approach - execute individual commands
      console.log('Trying individual table creation...')

      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS user_responses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            question_category VARCHAR(50) NOT NULL,
            question_id VARCHAR(100) NOT NULL,
            question_text TEXT NOT NULL,
            answer JSONB,
            is_required VARCHAR(10) NOT NULL DEFAULT 'false',
            is_skipped VARCHAR(10) NOT NULL DEFAULT 'false',
            skip_reason TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            metadata JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `

      const { error: tableError } = await supabase
        .from('user_responses')
        .select('*')
        .limit(1)

      if (tableError && tableError.code === 'PGRST116') {
        // Table doesn't exist, need to create it
        console.log('Table does not exist. Manual creation required.')
        console.log('Please run the migration manually in Supabase dashboard:')
        console.log(migrationSQL)
      } else if (!tableError) {
        console.log('✅ user_responses table already exists')
      } else {
        console.error('Unexpected error:', tableError)
      }
    } else {
      console.log('✅ user_responses table created successfully!')
    }

    // Test the table by trying to select from it
    const { data: testData, error: testError } = await supabase
      .from('user_responses')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('Error testing table:', testError)
    } else {
      console.log('✅ Table is accessible and working correctly')
    }

  } catch (error) {
    console.error('❌ Failed to create user_responses table:', error)
    process.exit(1)
  }
}

createUserResponsesTable()