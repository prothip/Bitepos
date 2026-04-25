import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
    }

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