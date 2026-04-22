import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('active') !== 'true'
    const staff = await prisma.staff.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const data = await request.json()
    const staff = await prisma.staff.create({
      data: {
        name: data.name,
        email: data.email || null,
        pin: data.pin ? await bcrypt.hash(String(data.pin), 10) : await bcrypt.hash('0000', 10),
        role: data.role || 'cashier',
        isActive: data.isActive ?? true,
        branchId: data.branchId || null,
      },
    })
    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Staff create error:', error)
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const data = await request.json()
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.pin !== undefined) updateData.pin = await bcrypt.hash(String(data.pin), 10)
    if (data.role !== undefined) updateData.role = data.role
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.branchId !== undefined) updateData.branchId = data.branchId

    const staff = await prisma.staff.update({ where: { id }, data: updateData })
    return NextResponse.json(staff)
  } catch (error) {
    console.error('Staff update error:', error)
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.staff.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Staff delete error:', error)
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 })
  }
}