#!/usr/bin/env node

/**
 * Setup Supabase Storage Bucket
 *
 * This script creates the 'documents' storage bucket and sets up proper RLS policies
 * Run with: node scripts/setup-storage-bucket.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorageBucket() {
  console.log('🚀 Setting up Supabase storage bucket...')

  try {
    // 1. Check if bucket already exists
    console.log('📋 Checking if documents bucket exists...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      throw new Error(`Failed to list buckets: ${bucketsError.message}`)
    }

    const documentsBucket = buckets.find(bucket => bucket.name === 'documents')

    if (documentsBucket) {
      console.log('✅ Documents bucket already exists')
    } else {
      console.log('📦 Creating documents bucket...')

      // Create the bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('documents', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ]
      })

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`)
      }

      console.log('✅ Documents bucket created successfully')
    }

    // 2. Set up RLS policies by executing SQL
    console.log('🔒 Setting up RLS policies...')

    const sqlFile = join(__dirname, 'setup-storage-bucket.sql')
    const sqlContent = readFileSync(sqlFile, 'utf8')

    // Execute the SQL setup
    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    })

    if (sqlError) {
      // If exec_sql doesn't exist, we'll try a different approach
      console.log('⚠️  exec_sql function not available, trying alternative approach...')

      // For now, let's provide manual SQL instructions
      console.log('\n📝 Please run the following SQL manually in your Supabase SQL editor:')
      console.log('```sql')
      console.log(sqlContent)
      console.log('```')
    } else {
      console.log('✅ RLS policies set up successfully')
    }

    // 3. Test the setup
    console.log('🧪 Testing bucket setup...')
    const { data: testBuckets, error: testError } = await supabase.storage.getBucket('documents')

    if (testError) {
      throw new Error(`Failed to verify bucket: ${testError.message}`)
    }

    console.log('✅ Bucket setup verified')
    console.log(`📊 Bucket details:`)
    console.log(`   - Name: ${testBuckets.name}`)
    console.log(`   - Public: ${testBuckets.public}`)
    console.log(`   - File size limit: ${testBuckets.file_size_limit} bytes`)
    console.log(`   - Created at: ${testBuckets.created_at}`)

    console.log('\n🎉 Storage bucket setup completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Make sure RLS policies are applied (run SQL if needed)')
    console.log('2. Test file upload functionality')
    console.log('3. Verify users can only access their own files')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('1. Ensure SUPABASE_SERVICE_ROLE_KEY is correct')
    console.error('2. Check if you have necessary permissions')
    console.error('3. Verify NEXT_PUBLIC_SUPABASE_URL is correct')
    process.exit(1)
  }
}

// Alternative setup using individual API calls
async function setupWithAPI() {
  console.log('🔧 Setting up with individual API calls...')

  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets.some(b => b.name === 'documents')

    if (!bucketExists) {
      // Create bucket
      await supabase.storage.createBucket('documents', {
        public: false,
        fileSizeLimit: 10485760,
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ]
      })
      console.log('✅ Bucket created')
    } else {
      console.log('✅ Bucket already exists')
    }

    console.log('\n⚠️  RLS policies must be set up manually in Supabase SQL editor:')
    console.log('   1. Go to Supabase dashboard > SQL Editor')
    console.log('   2. Run the contents of scripts/setup-storage-bucket.sql')
    console.log('   3. Verify policies are created correctly')

  } catch (error) {
    console.error('❌ API setup failed:', error.message)
    throw error
  }
}

// Main execution
async function main() {
  try {
    await setupStorageBucket()
  } catch (error) {
    console.log('\n🔄 Trying alternative setup method...')
    try {
      await setupWithAPI()
    } catch (fallbackError) {
      console.error('❌ All setup methods failed')
      console.error('\n📝 Manual setup required:')
      console.error('1. Go to Supabase dashboard')
      console.error('2. Create a bucket named "documents"')
      console.error('3. Set it to private')
      console.error('4. Set file size limit to 10MB')
      console.error('5. Add allowed MIME types: PDF, DOCX, TXT')
      console.error('6. Run scripts/setup-storage-bucket.sql for RLS policies')
      process.exit(1)
    }
  }
}

// Run the setup
main().catch(console.error)