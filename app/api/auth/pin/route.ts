import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'
import { checkRateLimit, getClientIp, LOGIN_OPTIONS } from '@/lib/rate-limit'
import { pinLoginSchema } from '@/lib/schemas'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  // Rate limit login attempts
  const ip = getClientIp(request)
  const rateCheck = checkRateLimit(`pin-login:${ip}`, LOGIN_OPTIONS)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = pinLoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { pin } = parsed.data

    // Get all active staff and compare PINs with bcrypt
    const staffList = await prisma.staff.findMany({
      where: { isActive: true },
    })

    let matchedStaff = null
    for (const staff of staffList) {
      // Support both plain text (legacy) and hashed PINs
      const isMatch = staff.pin.startsWith('$2')
        ? await bcrypt.compare(pin, staff.pin)
        : staff.pin === pin

      if (isMatch) {
        matchedStaff = staff
        // If plain text match, upgrade to bcrypt hash
        if (!staff.pin.startsWith('$2')) {
          const hash = await bcrypt.hash(staff.pin, 10)
          await prisma.staff.update({ where: { id: staff.id }, data: { pin: hash } })
        }
        break
      }
    }

    if (!matchedStaff) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const token = createToken({
      staffId: matchedStaff.id,
      name: matchedStaff.name,
      role: matchedStaff.role,
    })

    const cookie = setSessionCookie(token)
    const response = NextResponse.json({
      success: true,
      staffId: matchedStaff.id,
      name: matchedStaff.name,
      role: matchedStaff.role,
    })

    response.cookies.set(cookie.name, cookie.value, cookie.options)

    return response
  } catch (error) {
    console.error('PIN auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}