import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

/**
 * Check auth for API routes. Returns error response if not authenticated,
 * or null if auth passes (callers should proceed with their logic).
 */
export function checkApiAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get('bitepos_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = verifyToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  return null // auth passed
}

/**
 * Check auth and require admin role. Returns error response if not authenticated
 * or not an admin, or null if auth passes.
 */
export function checkAdminAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get('bitepos_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = verifyToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }
  return null
}

/**
 * Check auth and require manager or admin role. Returns error response if not
 * authenticated or insufficient role, or null if auth passes.
 */
export function checkManagerAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get('bitepos_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = verifyToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  if (session.role !== 'admin' && session.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden: manager access required' }, { status: 403 })
  }
  return null
}

/**
 * Get the current session from a request. Returns null if not authenticated.
 */
export function getSession(req: NextRequest) {
  const token = req.cookies.get('bitepos_session')?.value
  if (!token) return null
  return verifyToken(token)
}