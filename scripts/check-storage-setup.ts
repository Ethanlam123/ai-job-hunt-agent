#!/usr/bin/env ts-node

/**
 * Check Supabase Storage Setup
 *
 * This script checks if the storage bucket and policies are properly configured
 */

import { createClient } from '@supabase/supabase-js'

async function checkStorageSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🔍 Checking Supabase Storage setup...\n')

    // Check if storage is enabled
    console.log('1. Checking Storage service...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      if (bucketsError.message.includes('not found') || bucketsError.message.includes('404')) {
        console.log('❌ Supabase Storage is not enabled for your project')
        console.log('💡 To enable Storage:')
        console.log('   1. Go to your Supabase project dashboard')
        console.log('   2. Navigate to Storage section')
        console.log('   3. Click "Start using Storage" if not already enabled')
        return
      }
      throw bucketsError
    }

    console.log('✅ Supabase Storage is enabled')

    // Check for documents bucket
    console.log('\n2. Checking for documents bucket...')
    const documentsBucket = buckets.find(b => b.name === 'documents')

    if (!documentsBucket) {
      console.log('❌ "documents" bucket does not exist')
      console.log('💡 To create the bucket:')
      console.log('   Option 1: Run node scripts/setup-storage-bucket.js')
      console.log('   Option 2: Create manually in Supabase dashboard')
      console.log('   Option 3: Run the SQL in scripts/setup-storage-bucket.sql')
      return
    }

    console.log('✅ "documents" bucket exists')
    console.log(`📊 Bucket details:`)
    console.log(`   - Public: ${documentsBucket.public}`)
    console.log(`   - File size limit: ${documentsBucket.file_size_limit} bytes`)
    console.log(`   - Allowed MIME types: ${documentsBucket.allowed_mime_types?.join(', ') || 'Not specified'}`)

    // Check RLS policies (this is harder to check via API)
    console.log('\n3. Checking Row Level Security (RLS)...')
    console.log('⚠️  RLS policies cannot be checked via API')
    console.log('💡 To verify RLS policies:')
    console.log('   1. Go to Supabase dashboard > Authentication > Policies')
    console.log('   2. Look for storage.objects policies')
    console.log('   3. Ensure policies exist for authenticated users')

    // Test upload permissions with a dummy file
    console.log('\n4. Testing upload permissions...')
    const testFilePath = 'test-user/test-file.txt'
    const testContent = Buffer.from('test content', 'utf-8')

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFilePath, testContent, {
        contentType: 'text/plain',
        upsert: true
      })

    if (uploadError) {
      console.log('❌ Upload test failed:', uploadError.message)
      if (uploadError.message.includes('row level security')) {
        console.log('💡 RLS policies are missing or incorrect')
        console.log('   Run the SQL in scripts/setup-storage-bucket.sql')
      } else if (uploadError.message.includes('permission denied')) {
        console.log('💡 Service role key may not have sufficient permissions')
      }
    } else {
      console.log('✅ Upload test successful')

      // Clean up test file
      await supabase.storage.from('documents').remove([testFilePath])
      console.log('✅ Test file cleaned up')
    }

    console.log('\n🎉 Storage setup check completed!')
    console.log('\n📋 Summary:')
    console.log(`   ✅ Storage service: Enabled`)
    console.log(`   ✅ Documents bucket: ${documentsBucket ? 'Exists' : 'Missing'}`)
    console.log(`   ⚠️  RLS policies: Verify manually`)
    console.log(`   ✅ Upload permissions: ${uploadError ? 'Failed' : 'Working'}`)

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

// Run the check
checkStorageSetup()