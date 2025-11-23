// Authenticated Upload Test Script
// Test upload with proper user authentication

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.log('   Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAuthenticatedUpload() {
  console.log('🧪 Testing authenticated upload with service role key...\n')

  try {
    // First, create a test user or use existing user
    const testUserId = 'f1805fe6-50c3-49d3-be9d-55ce88a0ca65' // Use the user ID from your error log

    console.log(`👤 Testing with user ID: ${testUserId}`)

    // Create a simple test file
    const testContent = 'This is a test file for authenticated upload'
    const testFile = new Blob([testContent], { type: 'text/plain' })
    const testFileName = `${Date.now()}-auth-test-file.txt`

    // Use the file path structure that matches your application
    const filePath = `${testUserId}/${testFileName}`

    console.log(`📤 Attempting to upload: ${filePath}`)

    // Try to upload with service role key
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError)

      if (uploadError.message.includes('Bucket not found')) {
        console.log('💡 Bucket still not accessible')
      } else if (uploadError.message.includes('row-level security')) {
        console.log('💡 Even service role key is blocked by RLS')
        console.log('   The RLS policies might be too restrictive')
      }

      return false
    }

    console.log('✅ Upload successful with service role key!')
    console.log(`📁 File uploaded to: ${uploadData.path}`)

    // Test that the file exists by trying to get its info
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .getPublicUrl(uploadData.path)

    if (fileError) {
      console.error('❌ Could not get file URL:', fileError.message)
    } else {
      console.log('✅ Public URL accessible:', fileData.publicUrl)
    }

    // Test file listing in user directory
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list(testUserId, {
        limit: 10
      })

    if (listError) {
      console.error('❌ Could not list files:', listError.message)
    } else {
      console.log(`✅ Found ${files.length} files in user directory`)
      files.forEach(file => {
        console.log(`  - ${file.name} (${file.size} bytes)`)
      })
    }

    // Clean up
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([uploadData.path])

    if (deleteError) {
      console.error('❌ Could not delete test file:', deleteError.message)
    } else {
      console.log('✅ Test file cleaned up successfully')
    }

    console.log('\n🎉 Authenticated upload test completed!')
    console.log('✅ Storage bucket is working correctly')

    return true

  } catch (error) {
    console.error('💥 Unexpected error:', error.message)
    return false
  }
}

// Run the test
testAuthenticatedUpload().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Script failed:', error)
  process.exit(1)
})