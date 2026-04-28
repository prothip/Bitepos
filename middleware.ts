import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const intlMiddleware = createMiddleware({
  locales: ['en', 'my', 'zh', 'th'],
  defaultLocale: 'en',
  localeDetection: true,
})

const TRIAL_DAYS = 15

// HMAC key for signed cookies (matches JWT_SECRET from auth.ts)
const COOKIE_SECRET = process.env.JWT_SECRET || 'bitepos-dev-secret-CHANGE-IN-PROD'

/**
 * Sign a cookie value with HMAC (Edge-compatible).
 */
function signCookie(value: string): string {
  const hmac = crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('hex').slice(0, 16)
  return `${value}.${hmac}`
}

/**
 * Verify a signed cookie value. Returns original value or null.
 */
function verifySignedCookie(signed: string): string | null {
  const dotIdx = signed.lastIndexOf('.')
  if (dotIdx === -1) return null
  const value = signed.slice(0, dotIdx)
  const hmac = signed.slice(dotIdx + 1)
  const expected = crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('hex').slice(0, 16)
  if (hmac !== expected) return null
  return value
}

/**
 * Decode JWT payload without verification (Edge-compatible).
 * Token was verified at login time; we just need the role for routing.
 */
function decodeJWTPayload(token: string): { role?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  const allowList = ['/license', '/login', '/api/', '/_next/', '/fonts/', '/uploads/']
  if (allowList.some(p => pathname.includes(p))) {
    return intlMiddleware(req)
  }

  const locale = pathname.split('/')[1] || 'en'
  const allowedLocales = ['en', 'my', 'zh', 'th']
  const actualLocale = allowedLocales.includes(locale) ? locale : 'en'

  // --- Auth check ---
  const sessionToken = req.cookies.get('bitepos_session')?.value
  if (!sessionToken) {
    return NextResponse.redirect(new URL(`/${actualLocale}/login`, req.url))
  }

  // --- Role-based access ---
  const session = decodeJWTPayload(sessionToken)
  if (!session) {
    // Invalid token — clear cookie and redirect to login
    const res = NextResponse.redirect(new URL(`/${actualLocale}/login`, req.url))
    res.cookies.set('bitepos_session', '', { path: '/', maxAge: 0 })
    return res
  }

  // Admin pages require manager or admin role
  const isAdminPage = pathname.includes('/admin')
  if (isAdminPage && session.role !== 'admin' && session.role !== 'manager') {
    // Cashier trying to access admin — redirect to POS
    return NextResponse.redirect(new URL(`/${actualLocale}/pos`, req.url))
  }

  // --- License check ---
  // License token cookie: just check existence (real validation is server-side via /api/validate)
  const licenseToken = req.cookies.get('bitepos_license_token')?.value
  if (licenseToken) {
    return intlMiddleware(req)
  }

  // Trial cookie: must be signed to prevent tampering
  const trialStartCookie = req.cookies.get('bitepos_trial_start')?.value

  if (trialStartCookie) {
    const decoded = decodeURIComponent(trialStartCookie)
    const trialStart = verifySignedCookie(decoded)
    if (trialStart) {
      const startDate = new Date(trialStart)
      const daysUsed = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUsed < TRIAL_DAYS) {
        return intlMiddleware(req)
      }
      return NextResponse.redirect(new URL(`/${actualLocale}/license?trial=expired`, req.url))
    }
    // Tampered/invalid signature — fall through to re-set
  }

  // No valid license or trial cookie — set signed trial cookie and redirect to license page
  const now = new Date().toISOString()
  const res = NextResponse.redirect(new URL(`/${actualLocale}/license`, req.url))
  res.cookies.set('bitepos_trial_start', encodeURIComponent(signCookie(now)), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return res
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}