// Storage Upload Diagnostic Script
// Run this script to test if your Supabase storage is properly configured

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testStorageConfiguration() {
  console.log('🔍 Testing Supabase Storage Configuration...\n')

  try {
    // Test 1: Check if storage service is accessible
    console.log('1. Testing storage service access...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('❌ Cannot access storage service:', bucketsError.message)
      return false
    }

    console.log('✅ Storage service is accessible')
    console.log(`📋 Available buckets: ${buckets.length}`)

    // Test 2: Check if documents bucket exists
    console.log('\n2. Checking for documents bucket...')
    const documentsBucket = buckets.find(b => b.name === 'documents')

    if (!documentsBucket) {
      console.log('❌ Documents bucket not found')
      console.log('💡 Run the setup-storage-bucket.sql script first')
      return false
    }

    console.log('✅ Documents bucket found')
    console.log(`📊 Bucket details:`, {
      id: documentsBucket.id,
      name: documentsBucket.name,
      public: documentsBucket.public,
      file_size_limit: documentsBucket.file_size_limit,
      created_at: documentsBucket.created_at
    })

    // Test 3: Test file upload permissions
    console.log('\n3. Testing upload permissions...')

    // Create a simple test file
    const testFile = new Blob(['test content'], { type: 'text/plain' })
    const testFileName = 'test-storage-configuration.txt'

    // Try to upload (this will fail if RLS policies aren't set up correctly)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(`test/${testFileName}`, testFile, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.log('❌ Upload permission test failed:', uploadError.message)

      if (uploadError.message.includes('row-level security')) {
        console.log('💡 RLS policies may need to be applied')
      } else if (uploadError.message.includes('bucket not found')) {
        console.log('💡 Bucket creation may not be complete')
      }

      return false
    }

    console.log('✅ Upload permissions working')
    console.log(`📁 Test file uploaded: ${uploadData.path}`)

    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([`test/${testFileName}`])

    if (!deleteError) {
      console.log('✅ Test file cleaned up successfully')
    }

    // Test 4: List bucket contents (should be empty or show existing files)
    console.log('\n4. Testing list permissions...')
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list('', {
        limit: 10
      })

    if (listError) {
      console.log('❌ List permission test failed:', listError.message)
      return false
    }

    console.log('✅ List permissions working')
    console.log(`📄 Files in bucket: ${files.length}`)

    console.log('\n🎉 All storage configuration tests passed!')
    console.log('✅ Your storage is ready for file uploads')

    return true

  } catch (error) {
    console.error('❌ Unexpected error during storage test:', error.message)
    return false
  }
}

// Run the test
testStorageConfiguration().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Script failed:', error)
  process.exit(1)
})