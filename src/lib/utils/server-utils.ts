/**
 * Server-side utility functions for authentication and security
 *
 * These helpers work with Server Actions where Request object is not directly available
 */

import { headers } from 'next/headers'

/**
 * Get client IP address in Server Actions
 * Uses Next.js headers() function to access request headers
 *
 * @returns Client IP address
 */
export async function getClientIpServer(): Promise<string> {
  try {
    const headersList = await headers()

    // Try to get real IP from headers (behind proxy)
    const forwardedFor = headersList.get('x-forwarded-for')
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }

    const realIp = headersList.get('x-real-ip')
    if (realIp) {
      return realIp
    }

    const cfConnectingIp = headersList.get('cf-connecting-ip')
    if (cfConnectingIp) {
      return cfConnectingIp
    }

    const xClientIp = headersList.get('x-client-ip')
    if (xClientIp) {
      return xClientIp
    }

    // Fallback to a default value
    return 'unknown'
  } catch (error) {
    // headers() might not be available in all contexts
    return 'unknown'
  }
}

/**
 * Get user agent string in Server Actions
 *
 * @returns User agent string or 'unknown'
 */
export async function getUserAgentServer(): Promise<string> {
  try {
    const headersList = await headers()
    return headersList.get('user-agent') || 'unknown'
  } catch (error) {
    return 'unknown'
  }
}

/**
 * Create a request identifier for rate limiting and logging
 * Combines IP and user agent for better identification
 *
 * @returns Unique request identifier
 */
export function createRequestIdentifier(): string {
  const ip = getClientIpServer()
  const userAgent = getUserAgentServer()

  // Create a hash of the combination to avoid storing PII
  const combined = `${ip}:${userAgent}`
  return Buffer.from(combined).toString('base64').substring(0, 32)
}
