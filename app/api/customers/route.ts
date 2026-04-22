import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const count = searchParams.get('count')

    if (count === 'true') {
      const total = await prisma.customer.count()
      return NextResponse.json({ total })
    }

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Customers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const data = await request.json()

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        points: 0,
        lifetimePoints: 0,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Customer create error:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
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
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.points !== undefined) updateData.points = parseInt(data.points)
    if (data.lifetimePoints !== undefined) updateData.lifetimePoints = parseInt(data.lifetimePoints)

    const customer = await prisma.customer.update({ where: { id }, data: updateData })
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Customer update error:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Customer delete error:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
