import crypto from 'crypto'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET: string = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build' && !process.env.ELECTRON_RUN_AS_NODE ? (() => { throw new Error('JWT_SECRET environment variable is required in production. Generate one with: node -e "console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))"') })() : 'bitepos-dev-secret-CHANGE-IN-PROD')
const COOKIE_NAME = 'bitepos_session'
const SESSION_DURATION = 60 * 60 * 8 // 8 hours

// --- Trial/License cookie signing ---

/**
 * Sign a cookie value with HMAC to prevent tampering.
 * Format: value.hmac
 */
export function signCookieValue(value: string): string {
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(value).digest('hex').slice(0, 16)
  return `${value}.${hmac}`
}

/**
 * Verify a signed cookie value. Returns the original value or null if tampered.
 */
export function verifyCookieValue(signed: string): string | null {
  const dotIdx = signed.lastIndexOf('.')
  if (dotIdx === -1) return null
  const value = signed.slice(0, dotIdx)
  const hmac = signed.slice(dotIdx + 1)
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(value).digest('hex').slice(0, 16)
  if (hmac !== expected) return null
  return value
}

// --- Session types ---

export interface StaffSession {
  staffId: string
  name: string
  role: string
}

export interface AdminSession {
  staffId: string
  name: string
  role: string
  email: string
}

export type SessionPayload = (StaffSession | AdminSession) & {
  iat?: number
  exp?: number
}

/**
 * Create a JWT token for a staff session
 */
export function createToken(payload: StaffSession | AdminSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_DURATION })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload
  } catch {
    return null
  }
}

/**
 * Get the current session from cookies (server-side)
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * Set the session cookie (server-side, for API routes)
 */
export function setSessionCookie(token: string): {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax'
    maxAge: number
    path: string
  }
} {
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_DURATION,
      path: '/',
    },
  }
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/',
    },
  }
}

/**
 * Check if the current user has a required role
 */
export function hasRole(session: SessionPayload | null, ...roles: string[]): boolean {
  if (!session) return false
  return roles.includes(session.role)
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

/**
 * Require manager or admin role
 */
export async function requireManager(): Promise<SessionPayload> {
  const session = await requireAuth()
  if (!hasRole(session, 'manager', 'admin')) {
    throw new Error('Forbidden')
  }
  return session
}