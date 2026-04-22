import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'

const intlMiddleware = createMiddleware({
  locales: ['en', 'my', 'zh', 'th'],
  defaultLocale: 'en',
  localeDetection: true,
})

const TRIAL_DAYS = 15

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

  // --- License check (cookie-based for middleware, DB is source of truth for UI) ---
  const licenseToken = req.cookies.get('bitepos_license_token')?.value
  const trialStart = req.cookies.get('bitepos_trial_start')?.value

  if (licenseToken) {
    return intlMiddleware(req)
  }

  if (trialStart) {
    const startDate = new Date(decodeURIComponent(trialStart))
    const daysUsed = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUsed < TRIAL_DAYS) {
      return intlMiddleware(req)
    }
    return NextResponse.redirect(new URL(`/${actualLocale}/license?trial=expired`, req.url))
  }

  // No license or trial cookie — set trial cookie and redirect to license page
  const res = NextResponse.redirect(new URL(`/${actualLocale}/license`, req.url))
  res.cookies.set('bitepos_trial_start', new Date().toISOString(), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  return res
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}