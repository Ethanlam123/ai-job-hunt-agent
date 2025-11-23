// Direct Upload Test Script
// Test if we can upload directly to the documents bucket

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

async function testDirectUpload() {
  console.log('🧪 Testing direct file upload to documents bucket...\n')

  try {
    // Create a simple test file
    const testContent = 'This is a test file for storage upload'
    const testFile = new Blob([testContent], { type: 'text/plain' })
    const testFileName = `${Date.now()}-test-file.txt`

    // Simulate the file path structure used in your application
    const userId = 'test-user-id'  // We'll use a test user ID
    const filePath = `${userId}/${testFileName}`

    console.log(`📤 Attempting to upload: ${filePath}`)
    console.log(`📄 File size: ${testFile.size} bytes`)
    console.log(`📋 MIME type: ${testFile.type}`)

    // Try to upload directly to the bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError)

      if (uploadError.message.includes('Bucket not found')) {
        console.log('💡 The bucket exists in database but is not accessible via Storage API')
        console.log('   This might be a permissions or configuration issue')
      } else if (uploadError.message.includes('row-level security')) {
        console.log('💡 RLS policies are blocking the upload')
        console.log('   User authentication might be required')
      } else if (uploadError.message.includes('permission denied')) {
        console.log('💡 Permission denied - check RLS policies')
      }

      return false
    }

    console.log('✅ Upload successful!')
    console.log(`📁 File uploaded to: ${uploadData.path}`)
    console.log(`🆔 Upload ID: ${uploadData.id}`)

    // Test file access (try to get the uploaded file)
    console.log('\n🔍 Testing file access...')
    const { data: urlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(uploadData.path, 60) // 60 second expiry

    if (urlError) {
      console.error('❌ Could not create signed URL:', urlError.message)
    } else {
      console.log('✅ Signed URL created successfully')
      console.log(`🔗 URL: ${urlData.signedUrl}`)
    }

    // Test file listing
    console.log('\n📋 Testing file listing...')
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list(userId, {
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

    // Clean up - remove the test file
    console.log('\n🧹 Cleaning up test file...')
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([uploadData.path])

    if (deleteError) {
      console.error('❌ Could not delete test file:', deleteError.message)
    } else {
      console.log('✅ Test file cleaned up successfully')
    }

    console.log('\n🎉 Direct upload test completed successfully!')
    console.log('✅ The documents bucket is accessible via Storage API')

    return true

  } catch (error) {
    console.error('💥 Unexpected error:', error.message)
    return false
  }
}

// Run the test
testDirectUpload().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Script failed:', error)
  process.exit(1)
})