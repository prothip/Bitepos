import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const cookie = clearSessionCookie()
  response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  const cookie = clearSessionCookie()
  response.cookies.set(cookie.name, cookie.value, cookie.options)
  return response
}