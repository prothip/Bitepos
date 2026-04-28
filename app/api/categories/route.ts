import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth, checkManagerAuth, checkAdminAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authErr = checkApiAuth(request); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('active') !== 'true'
    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkManagerAuth(request); if (authErr) return authErr
  try {
    const data = await request.json()
    const category = await prisma.category.create({
      data: {
        nameEn: data.nameEn,
        nameMy: data.nameMy || '',
        nameZh: data.nameZh || '',
        nameTh: data.nameTh || '',
        color: data.color || '#E85D04',
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Category create error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
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
    ;['nameEn', 'nameMy', 'nameZh', 'nameTh', 'color'].forEach(f => { if (data[f] !== undefined) updateData[f] = data[f] })
    if (data.sortOrder !== undefined) updateData.sortOrder = parseInt(data.sortOrder)
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const cat = await prisma.category.update({ where: { id }, data: updateData })
    return NextResponse.json(cat)
  } catch (error) {
    console.error('Category update error:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authErr = checkAdminAuth(request); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Category delete error:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
