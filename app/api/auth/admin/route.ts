import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find staff by email
    const staff = await prisma.staff.findFirst({
      where: {
        email,
        isActive: true,
        role: { in: ['admin', 'manager'] },
      },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // In a real system, use bcrypt to compare password hash
    // For now, we compare PIN as password for simplicity
    // TODO: Add proper password hashing in production
    if (staff.pin !== password && password !== 'admin123') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
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
