/**
 * User Repository
 *
 * Handles all user-related data access operations with proper
 * separation of concerns and security controls.
 */

import { DatabaseClient } from '@/lib/types/database'
import { BaseRepository, IBaseRepository } from './base.repository'

/**
 * User entity interface
 */
export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  email_verified: boolean
  created_at: string
  updated_at: string
  last_sign_in_at?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
}

/**
 * User profile data (additional user information)
 */
export interface UserProfile {
  user_id: string
  first_name?: string
  last_name?: string
  phone?: string
  location?: string
  bio?: string
  website?: string
  linkedin_url?: string
  github_url?: string
  preferences: {
    email_notifications: boolean
    marketing_emails: boolean
    theme: 'light' | 'dark' | 'system'
    language: string
  }
  created_at: string
  updated_at: string
}

/**
 * User session data
 */
export interface UserSession {
  id: string
  user_id: string
  session_token: string
  status: 'active' | 'expired' | 'revoked'
  expires_at: string
  created_at: string
  updated_at: string
  ip_address?: string
  user_agent?: string
  last_activity: string
}

/**
 * Repository interface for user operations
 */
export interface IUserRepository extends IBaseRepository<User, string> {
  /** Find user by email */
  findByEmail(email: string): Promise<User | null>

  /** Find user with profile */
  findWithProfile(userId: string): Promise<(User & { profile?: UserProfile }) | null>

  /** Create or update user profile */
  upsertProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile>

  /** Get user profile */
  getProfile(userId: string): Promise<UserProfile | null>

  /** Update user preferences */
  updatePreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<boolean>

  /** Record user session */
  createSession(session: Omit<UserSession, 'id' | 'created_at' | 'updated_at'>): Promise<UserSession>

  /** Get active user sessions */
  getActiveSessions(userId: string): Promise<UserSession[]>

  /** Revoke user session */
  revokeSession(sessionId: string, userId: string): Promise<boolean>

  /** Revoke all user sessions */
  revokeAllSessions(userId: string): Promise<boolean>

  /** Update last activity */
  updateLastActivity(userId: string): Promise<boolean>

  /** Get user statistics */
  getUserStats(userId: string): Promise<{
    documentsCount: number
    sessionsCount: number
    analysesCount: number
    lastActivity: string | null
  }>
}

/**
 * User repository implementation
 */
export class UserRepository extends BaseRepository<User, string> implements IUserRepository {
  constructor(db: DatabaseClient) {
    super(db, 'users', 'id')
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT * FROM ${this.getTable()}
      WHERE email = $1
      LIMIT 1
    `
    const results = await this.db.query<User>(sql, [email])
    return results[0] || null
  }

  /**
   * Find user with profile
   */
  async findWithProfile(userId: string): Promise<(User & { profile?: UserProfile }) | null> {
    const sql = `
      SELECT
        u.*,
        p.first_name,
        p.last_name,
        p.phone,
        p.location,
        p.bio,
        p.website,
        p.linkedin_url,
        p.github_url,
        p.preferences,
        p.created_at as profile_created_at,
        p.updated_at as profile_updated_at
      FROM ${this.getTable()} u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1
      LIMIT 1
    `

    const results = await this.db.query(sql, [userId])

    if (results.length === 0) {
      return null
    }

    const row = results[0]

    // Transform row to include profile object
    const user: User & { profile?: UserProfile } = {
      id: row.id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      email_verified: row.email_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_sign_in_at: row.last_sign_in_at,
      user_metadata: row.user_metadata,
      app_metadata: row.app_metadata,
    }

    // Add profile if it exists
    if (row.first_name || row.preferences) {
      user.profile = {
        user_id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        location: row.location,
        bio: row.bio,
        website: row.website,
        linkedin_url: row.linkedin_url,
        github_url: row.github_url,
        preferences: row.preferences || {
          email_notifications: true,
          marketing_emails: false,
          theme: 'system',
          language: 'en',
        },
        created_at: row.profile_created_at,
        updated_at: row.profile_updated_at,
      }
    }

    return user
  }

  /**
   * Create or update user profile
   */
  async upsertProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    // Check if profile exists
    const existingProfile = await this.getProfile(userId)

    if (existingProfile) {
      // Update existing profile
      const keys = Object.keys(profileData).filter(key => profileData[key as keyof UserProfile] !== undefined)
      const values = keys.map(key => profileData[key as keyof UserProfile])
      const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ')

      const sql = `
        UPDATE user_profiles
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `

      const params = [userId, ...values]
      const results = await this.db.query<UserProfile>(sql, params)

      if (results.length === 0) {
        throw new Error('Failed to update user profile')
      }

      return results[0]
    } else {
      // Create new profile
      const keys = Object.keys(profileData).filter(key => profileData[key as keyof UserProfile] !== undefined)
      const values = keys.map(key => profileData[key as keyof UserProfile])

      const columns = ['user_id', ...keys]
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')

      const sql = `
        INSERT INTO user_profiles (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `

      const params = [userId, ...values]
      const results = await this.db.query<UserProfile>(sql, params)

      if (results.length === 0) {
        throw new Error('Failed to create user profile')
      }

      return results[0]
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const sql = `
      SELECT * FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
    `

    const results = await this.db.query<UserProfile>(sql, [userId])
    return results[0] || null
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<boolean> {
    const existingProfile = await this.getProfile(userId)

    if (!existingProfile) {
      // Create profile with preferences
      await this.upsertProfile(userId, {
        user_id: userId,
        preferences: {
          email_notifications: true,
          marketing_emails: false,
          theme: 'system',
          language: 'en',
          ...preferences,
        },
      } as UserProfile)
      return true
    }

    // Merge preferences and update
    const mergedPreferences = { ...existingProfile.preferences, ...preferences }

    const sql = `
      UPDATE user_profiles
      SET preferences = $2, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `

    const results = await this.db.query<{ rowCount: number }>(sql, [userId, mergedPreferences])
    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Record user session
   */
  async createSession(sessionData: Omit<UserSession, 'id' | 'created_at' | 'updated_at'>): Promise<UserSession> {
    const sql = `
      INSERT INTO user_sessions (user_id, session_token, status, expires_at, ip_address, user_agent, last_activity)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `

    const params = [
      sessionData.user_id,
      sessionData.session_token,
      sessionData.status,
      sessionData.expires_at,
      sessionData.ip_address,
      sessionData.user_agent,
      sessionData.last_activity,
    ]

    const results = await this.db.query<UserSession>(sql, params)

    if (results.length === 0) {
      throw new Error('Failed to create user session')
    }

    return results[0]
  }

  /**
   * Get active user sessions
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    const sql = `
      SELECT * FROM user_sessions
      WHERE user_id = $1
      AND status = 'active'
      AND expires_at > CURRENT_TIMESTAMP
      ORDER BY last_activity DESC
    `

    return this.db.query<UserSession>(sql, [userId])
  }

  /**
   * Revoke user session
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const sql = `
      UPDATE user_sessions
      SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      AND user_id = $2
      AND status = 'active'
    `

    const results = await this.db.query<{ rowCount: number }>(sql, [sessionId, userId])
    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllSessions(userId: string): Promise<boolean> {
    const sql = `
      UPDATE user_sessions
      SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      AND status = 'active'
    `

    const results = await this.db.query<{ rowCount: number }>(sql, [userId])
    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Update last activity
   */
  async updateLastActivity(userId: string): Promise<boolean> {
    const sql = `
      UPDATE ${this.getTable()}
      SET last_sign_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `

    const results = await this.db.query<{ rowCount: number }>(sql, [userId])

    // Also update session activity
    await this.db.query(`
      UPDATE user_sessions
      SET last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      AND status = 'active'
    `, [userId])

    return (results[0]?.rowCount || 0) > 0
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    documentsCount: number
    sessionsCount: number
    analysesCount: number
    lastActivity: string | null
  }> {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM documents WHERE user_id = $1) as documents_count,
        (SELECT COUNT(*) FROM user_sessions WHERE user_id = $1) as sessions_count,
        (SELECT COUNT(*) FROM sessions WHERE user_id = $1) as analyses_count,
        GREATEST(
          (SELECT MAX(last_activity) FROM user_sessions WHERE user_id = $1),
          (SELECT MAX(updated_at) FROM documents WHERE user_id = $1),
          (SELECT MAX(updated_at) FROM sessions WHERE user_id = $1)
        ) as last_activity
    `

    const results = await this.db.query(sql, [userId])

    if (results.length === 0) {
      return {
        documentsCount: 0,
        sessionsCount: 0,
        analysesCount: 0,
        lastActivity: null,
      }
    }

    const row = results[0]
    return {
      documentsCount: parseInt(row.documents_count) || 0,
      sessionsCount: parseInt(row.sessions_count) || 0,
      analysesCount: parseInt(row.analyses_count) || 0,
      lastActivity: row.last_activity,
    }
  }

  /**
   * Find users by criteria with additional filters
   */
  async findUsersByCriteria(criteria: {
    emailVerified?: boolean
    createdAfter?: Date
    createdBefore?: Date
    lastActiveAfter?: Date
    limit?: number
    offset?: number
  }): Promise<User[]> {
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (criteria.emailVerified !== undefined) {
      conditions.push(`email_verified = $${paramIndex}`)
      params.push(criteria.emailVerified)
      paramIndex++
    }

    if (criteria.createdAfter) {
      conditions.push(`created_at >= $${paramIndex}`)
      params.push(criteria.createdAfter.toISOString())
      paramIndex++
    }

    if (criteria.createdBefore) {
      conditions.push(`created_at <= $${paramIndex}`)
      params.push(criteria.createdBefore.toISOString())
      paramIndex++
    }

    if (criteria.lastActiveAfter) {
      conditions.push(`last_sign_in_at >= $${paramIndex}`)
      params.push(criteria.lastActiveAfter.toISOString())
      paramIndex++
    }

    let sql = `SELECT * FROM ${this.getTable()}`

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    sql += ` ORDER BY created_at DESC`

    if (criteria.limit) {
      sql += ` LIMIT $${paramIndex}`
      params.push(criteria.limit)
      paramIndex++
    }

    if (criteria.offset) {
      sql += ` OFFSET $${paramIndex}`
      params.push(criteria.offset)
    }

    return this.db.query<User>(sql, params)
  }
}

/**
 * Create user repository instance
 */
export function createUserRepository(db: DatabaseClient): IUserRepository {
  return new UserRepository(db)
}