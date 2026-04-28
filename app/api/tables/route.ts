import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth, checkManagerAuth, checkAdminAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authErr = checkApiAuth(request); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('active') !== 'true'
    const branchId = searchParams.get('branchId')
    const where: Record<string, unknown> = {}
    if (!includeInactive) where.isActive = true
    if (branchId) where.branchId = branchId
    const tables = await prisma.table.findMany({
      where,
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(tables)
  } catch (error) {
    console.error('Tables fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkManagerAuth(request); if (authErr) return authErr
  try {
    const data = await request.json()
    const table = await prisma.table.create({
      data: {
        name: data.name,
        section: data.section || 'Main',
        seats: data.seats || 4,
        posX: data.posX ?? 0,
        posY: data.posY ?? 0,
        width: data.width ?? 80,
        height: data.height ?? 80,
        isActive: data.isActive ?? true,
        branchId: data.branchId || null,
      },
    })
    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    console.error('Table create error:', error)
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authErr = checkManagerAuth(request); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const data = await request.json()
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.section !== undefined) updateData.section = data.section
    if (data.seats !== undefined) updateData.seats = data.seats
    if (data.posX !== undefined) updateData.posX = data.posX
    if (data.posY !== undefined) updateData.posY = data.posY
    if (data.width !== undefined) updateData.width = data.width
    if (data.height !== undefined) updateData.height = data.height
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const table = await prisma.table.update({ where: { id }, data: updateData })
    return NextResponse.json(table)
  } catch (error) {
    console.error('Table update error:', error)
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authErr = checkAdminAuth(request); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.table.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Table delete error:', error)
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
  }
}