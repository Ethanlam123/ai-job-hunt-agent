/**
 * Fix All RLS Policies
 *
 * This script fixes RLS policies for ALL tables with proper UUID comparisons
 */

import postgres from 'postgres'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set')
  process.exit(1)
}

async function fixAllRLSPolicies() {
  console.log('🔧 Fixing RLS policies for all tables...\n')

  const sql = postgres(connectionString!, { prepare: false })

  try {
    // Drop all existing policies first
    console.log('1️⃣ Dropping all existing RLS policies...\n')

    const dropPolicies = [
      // Sessions
      { table: 'sessions', policy: 'Users can view own sessions' },
      { table: 'sessions', policy: 'Users can insert own sessions' },
      { table: 'sessions', policy: 'Users can update own sessions' },
      { table: 'sessions', policy: 'Users can delete own sessions' },
      // Messages
      { table: 'messages', policy: 'Users can view own messages' },
      { table: 'messages', policy: 'Users can insert own messages' },
      // Documents
      { table: 'documents', policy: 'Users can view own documents' },
      { table: 'documents', policy: 'Users can insert own documents' },
      { table: 'documents', policy: 'Users can update own documents' },
      { table: 'documents', policy: 'Users can delete own documents' },
      // CV Embeddings
      { table: 'cv_embeddings', policy: 'Users can view own cv embeddings' },
      { table: 'cv_embeddings', policy: 'Users can insert own cv embeddings' },
      // Job Descriptions
      { table: 'job_descriptions', policy: 'Users can view own job descriptions' },
      { table: 'job_descriptions', policy: 'Users can insert own job descriptions' },
      // Tasks
      { table: 'tasks', policy: 'Users can view own tasks' },
      { table: 'tasks', policy: 'Users can insert own tasks' },
      { table: 'tasks', policy: 'Users can update own tasks' },
      // Cache
      { table: 'cache', policy: 'Users can view own cache' },
      { table: 'cache', policy: 'Users can insert own cache' },
      { table: 'cache', policy: 'Users can update own cache' },
      { table: 'cache', policy: 'Users can delete own cache' },
      // Rate Limits
      { table: 'rate_limits', policy: 'Users can manage rate limits' },
      // Approvals
      { table: 'approvals', policy: 'Users can view own approvals' },
      { table: 'approvals', policy: 'Users can insert own approvals' },
      { table: 'approvals', policy: 'Users can update own approvals' },
      // Skill Gaps
      { table: 'skill_gaps', policy: 'Users can view own skill gaps' },
      { table: 'skill_gaps', policy: 'Users can insert own skill gaps' },
      // User Metrics
      { table: 'user_metrics', policy: 'Users can view own metrics' },
      { table: 'user_metrics', policy: 'Users can insert own metrics' },
      // LLM Calls
      { table: 'llm_calls', policy: 'Users can view own llm calls' },
      { table: 'llm_calls', policy: 'Users can insert own llm calls' },
      // Interview Questions
      { table: 'interview_questions', policy: 'Users can view own interview questions' },
      { table: 'interview_questions', policy: 'Users can insert own interview questions' },
      { table: 'interview_questions', policy: 'Users can update own interview questions' },
      // Cover Letters
      { table: 'cover_letters', policy: 'Users can view own cover letters' },
      { table: 'cover_letters', policy: 'Users can insert own cover letters' },
      { table: 'cover_letters', policy: 'Users can update own cover letters' },
    ]

    for (const { table, policy } of dropPolicies) {
      try {
        await sql.unsafe(`DROP POLICY IF EXISTS "${policy}" ON ${table}`)
      } catch (error: any) {
        // Ignore errors
      }
    }
    console.log('   ✓ Dropped all existing policies\n')

    console.log('\n2️⃣ Creating correct RLS policies with UUID comparisons...\n')

    // Sessions
    await sql`CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE USING (user_id = auth.uid())`
    console.log('   ✓ Sessions policies')

    // Messages (via session relationship)
    await sql`
      CREATE POLICY "Users can view own messages" ON messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()
        )
      )
    `
    await sql`
      CREATE POLICY "Users can insert own messages" ON messages
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()
        )
      )
    `
    console.log('   ✓ Messages policies')

    // Documents
    await sql`CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (user_id = auth.uid())`
    console.log('   ✓ Documents policies')

    // CV Embeddings
    await sql`CREATE POLICY "Users can view own cv embeddings" ON cv_embeddings FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own cv embeddings" ON cv_embeddings FOR INSERT WITH CHECK (user_id = auth.uid())`
    console.log('   ✓ CV Embeddings policies')

    // Job Descriptions
    await sql`CREATE POLICY "Users can view own job descriptions" ON job_descriptions FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own job descriptions" ON job_descriptions FOR INSERT WITH CHECK (user_id = auth.uid())`
    console.log('   ✓ Job Descriptions policies')

    // Tasks
    await sql`CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (user_id = auth.uid())`
    console.log('   ✓ Tasks policies')

    // Cache (special handling for public and user-scoped keys)
    await sql`
      CREATE POLICY "Users can view own cache" ON cache
      FOR SELECT USING (
        key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
      )
    `
    await sql`
      CREATE POLICY "Users can insert own cache" ON cache
      FOR INSERT WITH CHECK (
        key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
      )
    `
    await sql`
      CREATE POLICY "Users can update own cache" ON cache
      FOR UPDATE USING (
        key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
      )
    `
    await sql`
      CREATE POLICY "Users can delete own cache" ON cache
      FOR DELETE USING (
        key LIKE 'public:%' OR key LIKE 'user:' || auth.uid()::text || ':%'
      )
    `
    console.log('   ✓ Cache policies')

    // Rate Limits (all authenticated users)
    await sql`CREATE POLICY "Users can manage rate limits" ON rate_limits FOR ALL USING (auth.uid() IS NOT NULL)`
    console.log('   ✓ Rate Limits policies')

    // Approvals
    await sql`CREATE POLICY "Users can view own approvals" ON approvals FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own approvals" ON approvals FOR INSERT WITH CHECK (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can update own approvals" ON approvals FOR UPDATE USING (user_id = auth.uid())`
    console.log('   ✓ Approvals policies')

    // Skill Gaps
    await sql`CREATE POLICY "Users can view own skill gaps" ON skill_gaps FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own skill gaps" ON skill_gaps FOR INSERT WITH CHECK (user_id = auth.uid())`
    console.log('   ✓ Skill Gaps policies')

    // User Metrics
    await sql`CREATE POLICY "Users can view own metrics" ON user_metrics FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own metrics" ON user_metrics FOR INSERT WITH CHECK (user_id = auth.uid())`
    console.log('   ✓ User Metrics policies')

    // LLM Calls
    await sql`CREATE POLICY "Users can view own llm calls" ON llm_calls FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own llm calls" ON llm_calls FOR INSERT WITH CHECK (user_id = auth.uid())`
    console.log('   ✓ LLM Calls policies')

    // Interview Questions
    await sql`CREATE POLICY "Users can view own interview questions" ON interview_questions FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own interview questions" ON interview_questions FOR INSERT WITH CHECK (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can update own interview questions" ON interview_questions FOR UPDATE USING (user_id = auth.uid())`
    console.log('   ✓ Interview Questions policies')

    // Cover Letters
    await sql`CREATE POLICY "Users can view own cover letters" ON cover_letters FOR SELECT USING (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can insert own cover letters" ON cover_letters FOR INSERT WITH CHECK (user_id = auth.uid())`
    await sql`CREATE POLICY "Users can update own cover letters" ON cover_letters FOR UPDATE USING (user_id = auth.uid())`
    console.log('   ✓ Cover Letters policies')

    console.log('\n✅ All RLS policies fixed successfully!\n')
    console.log('You can now:')
    console.log('  - Upload documents')
    console.log('  - Analyze CVs')
    console.log('  - Generate cover letters')
    console.log('  - Create interview questions')
    console.log('')

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

fixAllRLSPolicies()
