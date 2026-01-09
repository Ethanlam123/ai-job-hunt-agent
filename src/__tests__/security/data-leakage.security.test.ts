/**
 * Sensitive Data Leakage Security Tests
 *
 * Comprehensive tests to verify that sensitive data is not
 * leaked through API responses, error messages, logs, or
 * client-side code.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Test configuration
const LEAKAGE_TEST_TIMEOUT = 30000
const CLEANUP_TIMEOUT = 10000

describe('Sensitive Data Leakage Security Tests', () => {
  let supabase: SupabaseClient
  let adminClient: SupabaseClient | null = null
  let testUserId: string | null = null
  let testDocumentId: string | null = null

  // Patterns that should not appear in responses
  const SENSITIVE_PATTERNS = {
    // Database information
    databaseSchema: [/table\s+\w+/gi, /column\s+\w+/gi, /create\s+table/gi, /alter\s+table/gi],
    systemTables: [/pg_+/gi, /information_schema/gi, /sys\./gi],
    sqlErrors: [/syntax\s+error/gi, /column\s+".+"\s+does\s+not\s+exist/gi, /relation\s+".+"\s+does\s+not\s+exist/gi],

    // Internal paths and structure
    internalPaths: [/\/\.git\//gi, /\/node_modules\//gi, /src\/\//gi, /\.env\./gi],
    stackTraces: [/at\s+.*\s+\(.*:\d+:\d+\)/gi, /Error:\s+.*\n.*\n.*\n/gi],

    // Authentication secrets
    secrets: [/sk-\w+/gi, /eyJ\w+/gi, /-----BEGIN.*-----/gi, /-----END.*-----/gi],
    passwords: [/password[:\s=]+["']?\w+["']?/gi],
    apiKeys: [/api[_-]?key[:\s=]+["']?\w+["']?/gi],

    // Personal information patterns
    emailAddresses: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi],
    phoneNumbers: [/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/gi],
    ssnPatterns: [/\b\d{3}-\d{2}-\d{4}\b/gi],
    creditCards: [/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/gi],

    // File system paths
    filePaths: [/[A-Z]:\\.*\\/gi, /\/home\/.*\//gi, /\/Users\/.*\//gi],
    configFiles: [/\.env/gi, /\.config/gi, /config\./gi],

    // Database connection strings
    connectionStrings: [/postgres:\/\/.*@/gi, /mysql:\/\/.*@/gi, /mongodb:\/\/.*@/gi],

    // Internal error details
    internalErrors: [/internal server error/gi, /500\s+internal\s+error/gi, /fatal\s+error/gi],
  }

  beforeAll(async () => {
    // Initialize Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    supabase = createClient(supabaseUrl, supabaseKey)

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    }

    console.log('Data leakage test environment initialized')
  }, LEAKAGE_TEST_TIMEOUT)

  afterAll(async () => {
    await cleanupLeakageTestData()
    console.log('Data leakage test cleanup completed')
  }, CLEANUP_TIMEOUT)

  beforeEach(async () => {
    await setupLeakageTestData()
  }, CLEANUP_TIMEOUT)

  /**
   * Setup test data for leakage testing
   */
  async function setupLeakageTestData(): Promise<void> {
    try {
      if (!adminClient) return

      // Create test user with potentially sensitive information
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
        options: {
          data: {
            name: 'Leakage Test User',
            phone: '555-123-4567',
          },
        },
      })

      if (!userError && userData.user) {
        testUserId = userData.user.id

        // Create document with sensitive metadata
        const documentData = {
          user_id: testUserId,
          title: 'leakage-test-document',
          file_name: 'sensitive-info.pdf',
          file_path: `leakage-tests/${testUserId}/sensitive-info.pdf`,
          file_size: 2048,
          mime_type: 'application/pdf',
          content_type: 'cv',
          status: 'processed',
          parsed_content: {
            fullText: 'John Doe\nSoftware Engineer\nEmail: john.doe@company.com\nPhone: (555) 987-6543\nSSN: 123-45-6789',
            wordCount: 10,
          },
          metadata: {
            internalNotes: 'Contains sensitive PII data',
            processingFlags: ['sensitive_content'],
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
    } catch (error) {
      console.warn('Leakage test setup failed:', error)
    }
  }

  /**
   * Cleanup test data
   */
  async function cleanupLeakageTestData(): Promise<void> {
    try {
      if (adminClient && testUserId) {
        await adminClient.auth.admin.deleteUser(testUserId)
        await adminClient
          .from('documents')
          .delete()
          .like('title', 'leakage-test-%')

        testUserId = null
        testDocumentId = null
      }
    } catch (error) {
      console.warn('Leakage test cleanup failed:', error)
    }
  }

  /**
   * Check response for sensitive data patterns
   */
  function checkForDataLeaks(response: any, context: string): { leaks: string[]; safe: boolean } {
    const responseString = JSON.stringify(response)
    const leaks: string[] = []

    for (const [category, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = responseString.match(pattern)
        if (matches) {
          leaks.push(`${category}: ${matches.slice(0, 3).join(', ')}`)
        }
      }
    }

    return {
      leaks,
      safe: leaks.length === 0,
    }
  }

  describe('API Response Data Leakage Tests', () => {
    it('should not leak sensitive data in document responses', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping document response test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Test document listing
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', testUserId)

      expect(docError).toBeNull()
      const docLeakCheck = checkForDataLeaks(documents, 'document list response')
      expect(docLeakCheck.safe).toBe(true)
      if (docLeakCheck.leaks.length > 0) {
        console.warn('Document response leaks:', docLeakCheck.leaks)
      }

      // Test individual document response
      if (testDocumentId) {
        const { data: document, error: singleDocError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', testDocumentId)
          .single()

        expect(singleDocError).toBeNull()
        const singleDocLeakCheck = checkForDataLeaks(document, 'single document response')
        expect(singleDocLeakCheck.safe).toBe(true)
        if (singleDocLeakCheck.leaks.length > 0) {
          console.warn('Single document response leaks:', singleDocLeakCheck.leaks)
        }

        // Verify PII is properly redacted
        expect(document?.parsed_content?.fullText).not.toContain('john.doe@company.com')
        expect(document?.parsed_content?.fullText).not.toContain('(555) 987-6543')
        expect(document?.parsed_content?.fullText).not.toContain('123-45-6789')
      }
    })

    it('should not leak sensitive data in user profile responses', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping user profile test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Test user profile response
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      // Profile might not exist, so we check both success and error cases
      if (profile) {
        const profileLeakCheck = checkForDataLeaks(profile, 'user profile response')
        expect(profileLeakCheck.safe).toBe(true)
        if (profileLeakCheck.leaks.length > 0) {
          console.warn('User profile response leaks:', profileLeakCheck.leaks)
        }
      }

      // Test user response from auth
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const userLeakCheck = checkForDataLeaks(user, 'auth user response')
        expect(userLeakCheck.safe).toBe(true)
        if (userLeakCheck.leaks.length > 0) {
          console.warn('Auth user response leaks:', userLeakCheck.leaks)
        }

        // Verify sensitive user metadata is properly filtered
        expect(user.user_metadata?.phone).toBeUndefined()
        expect(user.user_metadata?.internal_id).toBeUndefined()
      }
    })

    it('should not leak sensitive data in error responses', async () => {
      // Test various error scenarios
      const errorScenarios = [
        () => supabase.from('documents').select('*').eq('id', 'invalid-uuid-format'),
        () => supabase.from('documents').select('*').eq('id', '00000000-0000-0000-0000-000000000000'),
        () => supabase.from('nonexistent_table').select('*'),
        () => supabase.from('documents').select('invalid_column'),
        () => supabase.from('documents').insert({ invalid_field: 'value' }),
        () => supabase.from('documents').update({ invalid_field: 'value' }).eq('id', 'fake-id'),
      ]

      for (const scenario of errorScenarios) {
        const { data, error } = await scenario()

        // Check error message for sensitive data
        if (error) {
          const errorLeakCheck = checkForDataLeaks(error, `error response: ${error.message}`)
          expect(errorLeakCheck.safe).toBe(true)
          if (errorLeakCheck.leaks.length > 0) {
            console.warn('Error response leaks:', errorLeakCheck.leaks)
          }

          // Verify error doesn't contain database structure information
          expect(error.message).not.toMatch(/table\s+\w+/gi)
          expect(error.message).not.toMatch(/column\s+\w+/gi)
          expect(error.message).not.toMatch(/constraint.*violated/gi)
        }

        // Check data response for sensitive information
        if (data) {
          const dataLeakCheck = checkForDataLeaks(data, 'error scenario data response')
          expect(dataLeakCheck.safe).toBe(true)
          if (dataLeakCheck.leaks.length > 0) {
            console.warn('Error scenario data leaks:', dataLeakCheck.leaks)
          }
        }
      }
    })

    it('should not leak sensitive data in session responses', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping session test')
        return
      }

      // Sign in as test user
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      expect(signInData.session).toBeTruthy()

      // Check session data for leaks
      const sessionLeakCheck = checkForDataLeaks(signInData, 'auth session response')
      expect(sessionLeakCheck.safe).toBe(true)
      if (sessionLeakCheck.leaks.length > 0) {
        console.warn('Session response leaks:', sessionLeakCheck.leaks)
      }

      // Verify sensitive session data is not exposed
      expect(signInData.session?.access_token).toBeTruthy()
      expect(signInData.session?.refresh_token).toBeTruthy()
      // But these tokens should be properly scoped and not contain sensitive user data

      // Test session retrieval
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const currentSessionLeakCheck = checkForDataLeaks(session, 'current session response')
        expect(currentSessionLeakCheck.safe).toBe(true)
        if (currentSessionLeakCheck.leaks.length > 0) {
          console.warn('Current session response leaks:', currentSessionLeakCheck.leaks)
        }
      }
    })
  })

  describe('Search and Filter Data Leakage Tests', () => {
    it('should not leak sensitive data through search functionality', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping search test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Test various search queries that might trigger data leaks
      const searchQueries = [
        { query: '', description: 'empty search' },
        { query: 'test', description: 'basic search' },
        { query: 'SELECT * FROM', description: 'SQL injection attempt' },
        { query: '<script>alert("xss")</script>', description: 'XSS attempt' },
        { query: '../../../etc/passwd', description: 'Path traversal attempt' },
        { query: 'john.doe@company.com', description: 'Email search' },
        { query: '(555) 987-6543', description: 'Phone search' },
        { query: '123-45-6789', description: 'SSN search' },
      ]

      for (const { query, description } of searchQueries) {
        const { data: results, error } = await supabase
          .from('documents')
          .select('*')
          .or(`title.ilike.%${query}%,parsed_content->>fullText.ilike.%${query}%`)

        expect(error).toBeNull()
        const searchLeakCheck = checkForDataLeaks(results, `search results for: ${description}`)
        expect(searchLeakCheck.safe).toBe(true)
        if (searchLeakCheck.leaks.length > 0) {
          console.warn(`Search leaks for ${description}:`, searchLeakCheck.leaks)
        }

        // Verify results don't contain sensitive PII
        if (Array.isArray(results)) {
          for (const result of results) {
            expect(result.parsed_content?.fullText).not.toContain('john.doe@company.com')
            expect(result.parsed_content?.fullText).not.toContain('(555) 987-6543')
            expect(result.parsed_content?.fullText).not.toContain('123-45-6789')
          }
        }
      }
    })

    it('should not leak sensitive data through filter operations', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping filter test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Test various filter combinations
      const filters = [
        { column: 'content_type', value: 'cv' },
        { column: 'status', value: 'processed' },
        { column: 'mime_type', value: 'application/pdf' },
        { column: 'file_size', value: 1000, operator: 'gt' },
        { column: 'created_at', value: new Date().toISOString(), operator: 'lt' },
      ]

      for (const filter of filters) {
        let query = supabase.from('documents').select('*')

        if (filter.operator === 'gt') {
          query = query.gt(filter.column, filter.value)
        } else if (filter.operator === 'lt') {
          query = query.lt(filter.column, filter.value)
        } else {
          query = query.eq(filter.column, filter.value)
        }

        const { data: results, error } = await query

        expect(error).toBeNull()
        const filterLeakCheck = checkForDataLeaks(results, `filter by ${filter.column}`)
        expect(filterLeakCheck.safe).toBe(true)
        if (filterLeakCheck.leaks.length > 0) {
          console.warn(`Filter leaks for ${filter.column}:`, filterLeakCheck.leaks)
        }
      }
    })
  })

  describe('Pagination and Aggregation Data Leakage Tests', () => {
    it('should not leak sensitive data through pagination', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping pagination test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Test pagination with various limits
      const paginationTests = [
        { limit: 1, offset: 0 },
        { limit: 10, offset: 0 },
        { limit: 100, offset: 0 },
        { limit: 10, offset: 5 },
        { limit: 1000, offset: 0 }, // Large limit test
      ]

      for (const { limit, offset } of paginationTests) {
        const { data: results, error } = await supabase
          .from('documents')
          .select('*', { count: 'exact' })
          .eq('user_id', testUserId)
          .range(offset, offset + limit - 1)

        expect(error).toBeNull()
        const paginationLeakCheck = checkForDataLeaks(results, `pagination limit=${limit}, offset=${offset}`)
        expect(paginationLeakCheck.safe).toBe(true)
        if (paginationLeakCheck.leaks.length > 0) {
          console.warn(`Pagination leaks for limit=${limit}:`, paginationLeakCheck.leaks)
        }

        // Verify reasonable data limits
        expect(Array.isArray(results)).toBe(true)
        expect(results && results.length).toBeLessThanOrEqual(limit)
      }
    })

    it('should not leak sensitive data through aggregation queries', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping aggregation test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Test aggregation queries
      const aggregationQueries = [
        () => supabase.from('documents').select('count'),
        () => supabase.from('documents').select('status', { count: 'exact' }),
        () => supabase.from('documents').select('content_type', { count: 'exact' }),
      ]

      for (const query of aggregationQueries) {
        const { data, error } = await query()

        expect(error).toBeNull()
        const aggregationLeakCheck = checkForDataLeaks(data, 'aggregation query response')
        expect(aggregationLeakCheck.safe).toBe(true)
        if (aggregationLeakCheck.leaks.length > 0) {
          console.warn('Aggregation query leaks:', aggregationLeakCheck.leaks)
        }
      }
    })
  })

  describe('Authentication Response Data Leakage Tests', () => {
    it('should not leak sensitive data in authentication responses', async () => {
      // Test signup response
      const testEmail = `test-signup-${Date.now()}@example.com`
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'SecurePass123!',
        options: {
          data: {
            name: 'Test User',
            internalField: 'should not leak',
          },
        },
      })

      expect(signUpError).toBeNull()
      const signUpLeakCheck = checkForDataLeaks(signUpData, 'signup response')
      expect(signUpLeakCheck.safe).toBe(true)
      if (signUpLeakCheck.leaks.length > 0) {
        console.warn('Signup response leaks:', signUpLeakCheck.leaks)
      }

      // Test signin response
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'SecurePass123!',
      })

      expect(signInError).toBeNull()
      const signInLeakCheck = checkForDataLeaks(signInData, 'signin response')
      expect(signInLeakCheck.safe).toBe(true)
      if (signInLeakCheck.leaks.length > 0) {
        console.warn('Signin response leaks:', signInLeakCheck.leaks)
      }

      // Verify user metadata filtering
      expect(signInData.user?.user_metadata?.internalField).toBeUndefined()

      // Test user recovery response (password reset)
      const { data: recoveryData, error: recoveryError } = await supabase.auth.resetPasswordForEmail(testEmail)

      expect(recoveryError).toBeNull()
      const recoveryLeakCheck = checkForDataLeaks(recoveryData, 'password reset response')
      expect(recoveryLeakCheck.safe).toBe(true)
      if (recoveryLeakCheck.leaks.length > 0) {
        console.warn('Password reset response leaks:', recoveryLeakCheck.leaks)
      }

      // Cleanup test user
      if (adminClient && signInData.user?.id) {
        await adminClient.auth.admin.deleteUser(signInData.user.id)
      }
    })
  })

  describe('File Upload Response Data Leakage Tests', () => {
    it('should not leak sensitive data in file upload responses', async () => {
      if (!testUserId) {
        console.warn('Test user not available, skipping file upload test')
        return
      }

      // Sign in as test user
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Test document creation with various metadata
      const testDocuments = [
        {
          title: 'safe-document',
          file_name: 'safe.pdf',
          file_path: `tests/${testUserId}/safe.pdf`,
          metadata: {
            category: 'test',
            isPublic: true,
          },
        },
        {
          title: 'document-with-sensitive-metadata',
          file_name: 'sensitive.pdf',
          file_path: `tests/${testUserId}/sensitive.pdf`,
          metadata: {
            internalNotes: 'Contains sensitive information',
            adminOnly: true,
            secretField: 'should not leak',
          },
        },
      ]

      for (const docData of testDocuments) {
        const document = {
          user_id: testUserId,
          title: docData.title,
          file_name: docData.file_name,
          file_path: docData.file_path,
          file_size: 1024,
          mime_type: 'application/pdf',
          content_type: 'cv',
          status: 'uploaded',
          metadata: docData.metadata,
        }

        const { data, error } = await supabase
          .from('documents')
          .insert(document)
          .select()
          .single()

        if (error) {
          // Should reject documents with sensitive metadata
          expect(error.message).toMatch(/invalid|denied|restricted/i)
        } else {
          // If accepted, verify metadata doesn't contain sensitive info
          const uploadLeakCheck = checkForDataLeaks(data, `document upload: ${docData.title}`)
          expect(uploadLeakCheck.safe).toBe(true)
          if (uploadLeakCheck.leaks.length > 0) {
            console.warn(`Document upload leaks for ${docData.title}:`, uploadLeakCheck.leaks)
          }

          // Verify sensitive metadata is filtered
          expect(data.metadata?.adminOnly).toBeUndefined()
          expect(data.metadata?.secretField).toBeUndefined()

          // Cleanup
          await supabase.from('documents').delete().eq('id', data.id)
        }
      }
    })
  })

  describe('Log and Monitoring Data Leakage Tests', () => {
    it('should not include sensitive data in error logging', async () => {
      // This test would require access to server logs
      // For now, we'll test error message content

      const errorScenarios = [
        () => supabase.from('documents').select('*').eq('id', 'invalid-uuid'),
        () => supabase.from('documents').select('nonexistent_column'),
        () => supabase.from('documents').insert({ user_id: 'invalid-uuid' }),
      ]

      for (const scenario of errorScenarios) {
        try {
          const { error } = await scenario()

          if (error) {
            // Check error message for sensitive patterns
            const errorMessage = error.message
            const errorLeakCheck = checkForDataLeaks(errorMessage, 'error message')
            expect(errorLeakCheck.safe).toBe(true)
            if (errorLeakCheck.leaks.length > 0) {
              console.warn('Error message leaks:', errorLeakCheck.leaks)
            }

            // Verify error doesn't contain stack traces or internal paths
            expect(errorMessage).not.toMatch(/at\s+.*\s+\(.*:\d+:\d+\)/gi)
            expect(errorMessage).not.toMatch(/\/src\//gi)
            expect(errorMessage).not.toMatch(/\/node_modules\//gi)
            expect(errorMessage).not.toMatch(/\.env/gi)
          }
        } catch (err) {
          // Check thrown exceptions for sensitive data
          const errorMessage = String(err)
          const exceptionLeakCheck = checkForDataLeaks(errorMessage, 'thrown exception')
          expect(exceptionLeakCheck.safe).toBe(true)
          if (exceptionLeakCheck.leaks.length > 0) {
            console.warn('Exception leaks:', exceptionLeakCheck.leaks)
          }
        }
      }
    })
  })

  describe('Client-Side Data Leakage Tests', () => {
    it('should not expose sensitive data in client-side storage', async () => {
      // Sign in to create session
      await supabase.auth.signInWithPassword({
        email: 'leakage-test@example.com',
        password: 'SecurePass123!',
      })

      // Check localStorage (if available in test environment)
      if (typeof localStorage !== 'undefined') {
        const localStorageKeys = Object.keys(localStorage)
        for (const key of localStorageKeys) {
          const value = localStorage.getItem(key)
          if (value) {
            const storageLeakCheck = checkForDataLeaks(value, `localStorage: ${key}`)
            expect(storageLeakCheck.safe).toBe(true)
            if (storageLeakCheck.leaks.length > 0) {
              console.warn(`LocalStorage leaks for ${key}:`, storageLeakCheck.leaks)
            }
          }
        }
      }

      // Check sessionStorage (if available)
      if (typeof sessionStorage !== 'undefined') {
        const sessionStorageKeys = Object.keys(sessionStorage)
        for (const key of sessionStorageKeys) {
          const value = sessionStorage.getItem(key)
          if (value) {
            const storageLeakCheck = checkForDataLeaks(value, `sessionStorage: ${key}`)
            expect(storageLeakCheck.safe).toBe(true)
            if (storageLeakCheck.leaks.length > 0) {
              console.warn(`SessionStorage leaks for ${key}:`, storageLeakCheck.leaks)
            }
          }
        }
      }
    })
  })
})