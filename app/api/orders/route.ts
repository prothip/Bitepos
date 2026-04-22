import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const date = searchParams.get('date')
    const branchId = searchParams.get('branchId')

    const where: Record<string, unknown> = {}

    if (branchId) {
      where.branchId = branchId
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.createdAt = { gte: startDate, lte: endDate }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
            modifiers: {
              include: { modifier: true },
            },
          },
        },
        payments: true,
        discounts: true,
        table: true,
        staff: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const data = await request.json()

    const orderNumber = generateOrderNumber()

    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: data.type || 'dine-in',
        status: data.status || 'pending',
        tableId: data.tableId || null,
        branchId: data.branchId || null,
        staffId: data.staffId || null,
        customerId: data.customerId || null,
        subtotal: data.subtotal || 0,
        taxAmount: data.taxAmount || 0,
        discountAmount: data.discountAmount || 0,
        total: data.total || 0,
        vatMode: data.vatMode || 'exclusive',
        taxRate: data.taxRate || 7,
        notes: data.notes || null,
        items: {
          create: (data.items || []).map((item: {
            productId: string
            quantity: number
            price: number
            nameSnapshot: string
            notes?: string
            weight?: number
            unit?: string
            pricingType?: string
          }) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceSnapshot: item.price,
            nameSnapshot: item.nameSnapshot,
            subtotal: item.pricingType === 'per_unit' ? item.price * (item.weight || 0) : item.price * item.quantity,
            notes: item.notes || null,
            weight: item.weight || null,
            unit: item.unit || null,
            pricingType: item.pricingType || 'per_item',
          })),
        },
        payments: {
          create: data.paymentMethod ? [{
            method: data.paymentMethod,
            amount: data.total,
            tendered: data.amountTendered || data.total,
            change: Math.max(0, (data.amountTendered || data.total) - data.total),
          }] : [],
        },
      },
      include: {
        items: true,
        payments: true,
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Order create error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
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

    if (data.status !== undefined) updateData.status = data.status
    if (data.isHeld !== undefined) updateData.isHeld = data.isHeld
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.tableId !== undefined) updateData.tableId = data.tableId
    if (data.staffId !== undefined) updateData.staffId = data.staffId
    if (data.customerId !== undefined) updateData.customerId = data.customerId

    // Void handling
    if (data.status === 'voided') {
      updateData.voidedAt = new Date()
      updateData.voidReason = data.voidReason || 'Voided by admin'
    }

    const order = await prisma.order.update({ where: { id }, data: updateData, include: { items: true, payments: true, table: true, staff: true, customer: true } })
    return NextResponse.json(order)
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authErr = checkApiAuth(request || (null as any)); if (authErr) return authErr
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order delete error:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}
