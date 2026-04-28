/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window per IP address.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  limit: 60,
  windowMs: 60 * 1000, // 60 requests per minute
}

const LOGIN_OPTIONS: RateLimitOptions = {
  limit: 5,
  windowMs: 15 * 60 * 1000, // 5 requests per 15 minutes
}

const STRICT_OPTIONS: RateLimitOptions = {
  limit: 3,
  windowMs: 15 * 60 * 1000, // 3 requests per 15 minutes
}

/**
 * Check rate limit for a given key. Returns { allowed, retryAfterMs, remaining }.
 */
export function checkRateLimit(key: string, options: RateLimitOptions = DEFAULT_OPTIONS): {
  allowed: boolean
  retryAfterMs: number
  remaining: number
} {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, retryAfterMs: 0, remaining: options.limit - 1 }
  }

  if (entry.count >= options.limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now, remaining: 0 }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0, remaining: options.limit - entry.count }
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: { headers: Headers }): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export { DEFAULT_OPTIONS, LOGIN_OPTIONS, STRICT_OPTIONS }