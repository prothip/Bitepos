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