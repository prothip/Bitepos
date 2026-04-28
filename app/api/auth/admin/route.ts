import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'
import { checkRateLimit, getClientIp, LOGIN_OPTIONS } from '@/lib/rate-limit'
import { adminLoginSchema } from '@/lib/schemas'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  // Rate limit admin login attempts
  const ip = getClientIp(request)
  const rateCheck = checkRateLimit(`admin-login:${ip}`, LOGIN_OPTIONS)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = adminLoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { email, password } = parsed.data

    // Find staff by email (admin or manager only)
    const staff = await prisma.staff.findFirst({
      where: {
        email,
        isActive: true,
        role: { in: ['admin', 'manager'] },
      },
    })

    if (!staff) {
      // Use generic error to prevent email enumeration
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Compare password against hashed PIN (bcrypt) or legacy plain PIN
    const isMatch = staff.pin.startsWith('$2')
      ? await bcrypt.compare(password, staff.pin)
      : staff.pin === password

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Upgrade plain text PIN to bcrypt hash if needed
    if (!staff.pin.startsWith('$2')) {
      const hash = await bcrypt.hash(staff.pin, 10)
      await prisma.staff.update({ where: { id: staff.id }, data: { pin: hash } })
    }

    const token = createToken({
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
      email: staff.email || '',
    })

    const cookie = setSessionCookie(token)
    const response = NextResponse.json({
      success: true,
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
    })

    response.cookies.set(cookie.name, cookie.value, cookie.options)

    return response
  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('bitepos_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  })
  return response
}
