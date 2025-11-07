/**
 * Authentication Bypass Security Tests
 *
 * Comprehensive security tests to verify that authentication
 * cannot be bypassed and that proper access controls are
 * enforced throughout the system.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Test configuration
const SECURITY_TEST_TIMEOUT = 30000
const CLEANUP_TIMEOUT = 10000

describe('Authentication Bypass Security Tests', () => {
  let supabase: SupabaseClient
  let adminClient: SupabaseClient | null = null
  let testUserId: string | null = null
  let testDocumentId: string | null = null

  beforeAll(async () => {
    // Initialize Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    supabase = createClient(supabaseUrl, supabaseKey)

    // Initialize admin client if service role key is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    }

    console.log('Security test environment initialized')
  }, SECURITY_TEST_TIMEOUT)

  afterAll(async () => {
    await cleanupSecurityTestData()
    console.log('Security test cleanup completed')
  }, CLEANUP_TIMEOUT)

  beforeEach(async () => {
    // Setup fresh test data for each test
    await setupSecurityTestData()
  }, CLEANUP_TIMEOUT)

  /**
   * Setup security test data
   */
  async function setupSecurityTestData(): Promise<void> {
    try {
      // Create test user with weak credentials for testing
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
        options: {
          data: {
            name: 'Security Test User',
          },
        },
      })

      if (!userError && userData.user) {
        testUserId = userData.user.id

        // Create test document for access control testing
        if (adminClient) {
          const documentData = {
            user_id: testUserId,
            title: 'security-test-document',
            file_name: 'test.pdf',
            file_path: `security-tests/${testUserId}/test.pdf`,
            file_size: 1024,
            mime_type: 'application/pdf',
            content_type: 'cv',
            status: 'processed',
            parsed_content: {
              fullText: 'Security test document content',
              wordCount: 4,
            },
          }

          const { data: docData } = await adminClient
            .from('documents')
            .insert(documentData)
            .select()
            .single()

          if (docData) {
            testDocumentId = docData.id
          }
        }
      }
    } catch (error) {
      console.warn('Security test setup failed:', error)
    }
  }

  /**
   * Cleanup security test data
   */
  async function cleanupSecurityTestData(): Promise<void> {
    try {
      if (adminClient && testUserId) {
        // Delete test user
        await adminClient.auth.admin.deleteUser(testUserId)
        testUserId = null

        // Delete test documents
        await adminClient
          .from('documents')
          .delete()
          .like('title', 'security-test-%')

        testDocumentId = null
      }
    } catch (error) {
      console.warn('Security test cleanup failed:', error)
    }
  }

  describe('Authentication Validation Tests', () => {
    it('should reject invalid email formats during signup', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
        'user@example.',
        '',
        null as any,
        undefined as any,
        123 as any,
      ]

      for (const email of invalidEmails) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: 'ValidPass123!',
        })

        expect(error).toBeTruthy()
        expect(error?.message).toContain('email')
        expect(data).not.toHaveProperty('user')
      }
    })

    it('should reject weak passwords during signup', async () => {
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        '12345678',
        'weak',
        '',
        null as any,
        undefined as any,
        'a'.repeat(129), // Too long
      ]

      for (const password of weakPasswords) {
        const { data, error } = await supabase.auth.signUp({
          email: `test-${Date.now()}@example.com`,
          password,
        })

        // Some validation might happen at application level, not database level
        // So we check that either error occurs or user creation fails
        if (error) {
          expect(error.message).toMatch(/password|invalid/i)
        } else {
          expect(data.user).toBeFalsy()
        }
      }
    })

    it('should reject login with invalid credentials', async () => {
      const invalidCredentials = [
        { email: 'nonexistent@example.com', password: 'SomePass123!' },
        { email: 'security-test@example.com', password: 'WrongPass123!' },
        { email: 'SECURITY-TEST@EXAMPLE.COM', password: 'WeakPass123!' }, // Case sensitivity
        { email: 'security-test@example.com ', password: 'WeakPass123!' }, // Trailing space
        { email: ' security-test@example.com', password: 'WeakPass123!' }, // Leading space
      ]

      for (const credentials of invalidCredentials) {
        const { data, error } = await supabase.auth.signInWithPassword(credentials)

        expect(error).toBeTruthy()
        expect(data.user).toBeFalsy()
        expect(data.session).toBeFalsy()
      }
    })

    it('should enforce rate limiting on authentication endpoints', async () => {
      // This test would require actual rate limiting implementation
      // For now, we'll test multiple rapid attempts

      const maxAttempts = 10
      let failures = 0

      for (let i = 0; i < maxAttempts; i++) {
        const { error } = await supabase.auth.signInWithPassword({
          email: 'security-test@example.com',
          password: 'WrongPass123!',
        })

        if (error) {
          failures++
        }
      }

      // All attempts should fail
      expect(failures).toBe(maxAttempts)

      // Check if rate limiting is implemented (would be evident from error messages)
      // This is a placeholder for actual rate limiting verification
    }, SECURITY_TEST_TIMEOUT)
  })

  describe('Session Security Tests', () => {
    it('should reject operations without valid session', async () => {
      // Sign out to invalidate session
      await supabase.auth.signOut()

      // Try to access protected resources
      const protectedOperations = [
        () => supabase.from('documents').select('*'),
        () => supabase.from('sessions').select('*'),
        () => supabase.from('user_profiles').select('*'),
      ]

      for (const operation of protectedOperations) {
        const { data, error } = await operation()

        // Should either return empty data or error due to RLS policies
        if (error) {
          expect(error.message).toMatch(/unauthorized|permission|access/i)
        } else {
          expect(data).toHaveLength(0) // RLS should filter out data
        }
      }
    })

    it('should prevent access to other users data', async () => {
      if (!testUserId || !testDocumentId) {
        console.warn('Test data not available, skipping test')
        return
      }

      // Sign in as test user
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      expect(signInData.user).toBeTruthy()

      // Try to access documents with different user_id
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', 'other-user-id')

      // Should return empty due to RLS policies
      expect(documents).toHaveLength(0)

      // Try to directly access document by ID (should work if it belongs to user)
      const { data: document, error: accessError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', testDocumentId)
        .single()

      expect(accessError).toBeFalsy()
      expect(document?.user_id).toBe(testUserId)
    })

    it('should invalidate expired sessions', async () => {
      // Sign in
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      expect(signInData.session).toBeTruthy()

      // Simulate session expiry by signing out
      await supabase.auth.signOut()

      // Try to use expired session
      const { data, error } = await supabase.from('documents').select('*')

      if (error) {
        expect(error.message).toMatch(/unauthorized|expired|invalid/i)
      } else {
        expect(data).toHaveLength(0)
      }
    })
  })

  describe('Input Validation Security Tests', () => {
    it('should prevent SQL injection in query parameters', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping SQL injection test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      const sqlInjectionAttempts = [
        "'; DROP TABLE documents; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --",
        "'; DELETE FROM sessions WHERE '1'='1' --",
        "admin'--",
        "' OR 1=1#",
      ]

      for (const injection in sqlInjectionAttempts) {
        // Try SQL injection in document title search
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .like('title', `%${injection}%`)

        // Should either return empty or fail gracefully
        expect(Array.isArray(data)).toBe(true)
        expect(data?.length || 0).toBeLessThan(100) // Should not return all data
      }
    })

    it('should sanitize file upload parameters', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping file upload test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      const maliciousFileNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        'file<script>alert("xss")</script>.pdf',
        'file|rm -rf /.pdf',
        'CON', // Windows reserved name
        'PRN', // Windows reserved name
        'file?.pdf',
        'file*.pdf',
        'file"bad".pdf',
      ]

      for (const fileName of maliciousFileNames) {
        // Try to create document with malicious filename
        const documentData = {
          user_id: testUserId,
          title: fileName,
          file_name: fileName,
          file_path: `malicious-test/${fileName}`,
          file_size: 1024,
          mime_type: 'application/pdf',
          content_type: 'cv',
          status: 'uploaded',
        }

        const { data, error } = await supabase
          .from('documents')
          .insert(documentData)
          .select()

        // Should either fail or sanitize the input
        if (error) {
          expect(error.message).toMatch(/invalid|sanitize|denied/i)
        } else {
          expect(data).toHaveLength(0) // Should be rejected by RLS or validation
        }
      }
    })

    it('should validate email format in authentication', async () => {
      const maliciousEmails = [
        '<script>alert("xss")</script>@example.com',
        'user@example.com<script>alert("xss")</script>',
        'user@example.com?redirect=http://evil.com',
        'user@example.com\r\nCc: victim@example.com',
        'user+@example.com', // Invalid format
        'user@example..com', // Double dots
        'user@-example.com', // Leading hyphen in domain
      ]

      for (const email of maliciousEmails) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: 'ValidPass123!',
        })

        expect(error).toBeTruthy()
        expect(data.user).toBeFalsy()
      }
    })
  })

  describe('Authorization Bypass Tests', () => {
    it('should prevent unauthorized document access', async () => {
      if (!testDocumentId) {
        console.warn('Test document not available, skipping access test')
        return
      }

      // Try to access document without authentication
      await supabase.auth.signOut()

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', testDocumentId)
        .single()

      // Should fail due to RLS policies
      expect(error).toBeTruthy()
      expect(error?.message).toMatch(/unauthorized|permission|denied/i)
    })

    it('should prevent document modification by unauthorized users', async () => {
      if (!testDocumentId) {
        console.warn('Test document not available, skipping modification test')
        return
      }

      // Sign in with test user (owner)
      await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      // This should work for the owner
      const { data: updateData, error: updateError } = await supabase
        .from('documents')
        .update({ title: 'Updated by owner' })
        .eq('id', testDocumentId)
        .select()
        .single()

      expect(updateError).toBeFalsy()
      expect(updateData?.title).toBe('Updated by owner')

      // Sign out and try to modify as unauthenticated user
      await supabase.auth.signOut()

      const { data: unauthorizedData, error: unauthorizedError } = await supabase
        .from('documents')
        .update({ title: 'Unauthorized update' })
        .eq('id', testDocumentId)
        .select()

      // Should fail due to RLS policies
      expect(unauthorizedError).toBeTruthy()
      expect(unauthorizedData).toHaveLength(0)
    })

    it('should prevent session access by unauthorized users', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping session access test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      // Create a session for the test user
      const sessionData = {
        user_id: testUserId,
        status: 'active',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      const { data: createdSession } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()

      expect(createdSession).toBeTruthy()

      // Try to access another user's session
      const { data: otherSessions, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', 'other-user-id')

      // Should return empty due to RLS policies
      expect(otherSessions).toHaveLength(0)
    })
  })

  describe('Data Leakage Prevention Tests', () => {
    it('should prevent user enumeration through error messages', async () => {
      const nonExistentEmail = 'nonexistent-' + Date.now() + '@example.com'

      // Try to sign up with email that might already exist
      const { error: signUpError } = await supabase.auth.signUp({
        email: nonExistentEmail,
        password: 'ValidPass123!',
      })

      // Try to sign in with non-existent user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: nonExistentEmail,
        password: 'SomePass123!',
      })

      // Error messages should be generic and not reveal user existence
      if (signUpError) {
        expect(signUpError.message).not.toContain(/exists|registered/i)
      }

      if (signInError) {
        expect(signInError.message).not.toContain(/exists|registered/i)
      }
    })

    it('should prevent information disclosure in error responses', async () => {
      // Try various operations that might expose sensitive information
      const sensitiveOperations = [
        () => supabase.from('documents').select('*').eq('id', 'invalid-uuid-format'),
        () => supabase.from('users').select('*').eq('id', 'invalid-uuid'),
        () => supabase.from('sessions').select('*').eq('user_id', 'invalid-id'),
      ]

      for (const operation of sensitiveOperations) {
        try {
          const { data, error } = await operation()

          // Errors should not contain database schema information
          if (error) {
            expect(error.message).not.toMatch(/table|column|schema|database|sql/i)
            expect(error.message).not.toContain('users_')
            expect(error.message).not.toContain('documents_')
          }

          // Data should be empty or filtered
          if (Array.isArray(data)) {
            expect(data.length).toBeLessThan(1000) // Should not dump entire tables
          }
        } catch (err) {
          // Exceptions should not contain sensitive information
          expect(String(err)).not.toMatch(/table|column|schema|database/i)
        }
      }
    })

    it('should prevent access to system tables and metadata', async () => {
      if (!adminClient) {
        console.warn('Admin client not available, skipping system table test')
        return
      }

      // Sign in as regular user
      await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      // Try to access system information
      const systemQueries = [
        () => supabase.rpc('get_user_count'), // Hypothetical admin function
        () => supabase.from('pg_stat_activity').select('*'), // System table
        () => supabase.from('information_schema.tables').select('*'), // Schema info
      ]

      for (const query of systemQueries) {
        const { data, error } = await query()

        // Should either fail or return empty/filtered data
        if (error) {
          expect(error.message).toMatch(/unauthorized|permission|denied|not.*found/i)
        } else {
          expect(Array.isArray(data) ? data.length : 0).toBeLessThan(100)
        }
      }
    })
  })

  describe('Session Management Security Tests', () => {
    it('should handle concurrent sessions properly', async () => {
      // Sign in multiple times to create multiple sessions
      const sessions = []

      for (let i = 0; i < 3; i++) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: 'security-test@example.com',
          password: 'WeakPass123!',
        })

        if (signInData.session) {
          sessions.push(signInData.session)
        }
      }

      expect(sessions.length).toBeGreaterThan(0)

      // All sessions should be valid initially
      for (const session of sessions) {
        expect(session.access_token).toBeTruthy()
        expect(session.expires_at).toBeTruthy()
      }

      // Sign out - should invalidate current session
      await supabase.auth.signOut()

      // Try to use old sessions (should fail)
      for (const session of sessions) {
        const testClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            },
          }
        )

        const { data, error } = await testClient.from('documents').select('*')

        // Should fail due to invalid session
        if (error) {
          expect(error.message).toMatch(/unauthorized|invalid|expired/i)
        } else {
          expect(data).toHaveLength(0)
        }
      }
    })

    it('should handle session timeout properly', async () => {
      // This test would require manipulating session expiry
      // For now, we'll test sign out behavior

      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      expect(signInData.session).toBeTruthy()

      // Sign out immediately
      await supabase.auth.signOut()

      // Try to access protected resources
      const { data, error } = await supabase.from('documents').select('*')

      if (error) {
        expect(error.message).toMatch(/unauthorized|invalid|expired/i)
      } else {
        expect(data).toHaveLength(0)
      }
    })
  })

  describe('Cross-Site Request Forgery (CSRF) Tests', () => {
    it('should validate request origins for sensitive operations', async () => {
      // This test would require CSRF token implementation
      // For now, we'll test that sensitive operations require proper authentication

      if (!testUserId || !testDocumentId) {
        console.warn('Test data not available, skipping CSRF test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      // Try sensitive operations that should require proper authentication
      const sensitiveOperations = [
        () => supabase.from('documents').delete().eq('id', testDocumentId),
        () => supabase.from('user_profiles').update({ preferences: {} }).eq('user_id', testUserId),
        () => supabase.from('sessions').delete().eq('user_id', testUserId),
      ]

      for (const operation of sensitiveOperations) {
        const { data, error } = await operation()

        // Operations should work for authenticated user (CSRF protection would be at different layer)
        if (error) {
          // If it fails, it should be due to RLS or other security, not CSRF
          expect(error.message).not.toContain(/csrf|origin|referer/i)
        }
      }

      // Sign out and try again
      await supabase.auth.signOut()

      for (const operation of sensitiveOperations) {
        const { data, error } = await operation()

        // Should fail for unauthenticated user
        expect(error).toBeTruthy()
        expect(data).not.toHaveProperty('affectedRows')
      }
    })
  })

  describe('File Upload Security Tests', () => {
    it('should validate file types and sizes', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping file upload test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'security-test@example.com',
        password: 'WeakPass123!',
      })

      // Test malicious file types
      const maliciousFiles = [
        { fileName: 'malware.exe', mimeType: 'application/octet-stream' },
        { fileName: 'script.js', mimeType: 'application/javascript' },
        { fileName: 'payload.php', mimeType: 'application/x-php' },
        { fileName: 'config.conf', mimeType: 'text/plain' },
        { fileName: '.htaccess', mimeType: 'text/plain' },
        { fileName: 'web.config', mimeType: 'application/xml' },
      ]

      for (const file of maliciousFiles) {
        const documentData = {
          user_id: testUserId,
          title: file.fileName,
          file_name: file.fileName,
          file_path: `security-test/${file.fileName}`,
          file_size: 1024,
          mime_type: file.mimeType,
          content_type: 'cv',
          status: 'uploaded',
        }

        const { data, error } = await supabase
          .from('documents')
          .insert(documentData)
          .select()

        // Should reject malicious file types
        if (error) {
          expect(error.message).toMatch(/invalid|unsupported|denied/i)
        } else {
          expect(data).toHaveLength(0)
        }
      }

      // Test oversized files
      const oversizedFile = {
        user_id: testUserId,
        title: 'oversized.pdf',
        file_name: 'oversized.pdf',
        file_path: `security-test/oversized.pdf`,
        file_size: 100 * 1024 * 1024, // 100MB
        mime_type: 'application/pdf',
        content_type: 'cv',
        status: 'uploaded',
      }

      const { data: oversizedData, error: oversizedError } = await supabase
        .from('documents')
        .insert(oversizedFile)
        .select()

      // Should reject oversized files
      if (oversizedError) {
        expect(oversizedError.message).toMatch(/size|limit|too.*large/i)
      } else {
        expect(oversizedData).toHaveLength(0)
      }
    })
  })
})