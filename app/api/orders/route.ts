import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth, checkManagerAuth, checkAdminAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const authErr = checkApiAuth(request); if (authErr) return authErr
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
  const authErr = checkApiAuth(request); if (authErr) return authErr
  try {
    const data = await request.json()

    const orderNumber = generateOrderNumber()

    // Calculate points for customer loyalty
    let pointsEarned = 0
    let pointsRedeemed = 0
    const loyaltyRate = await getSetting('loyaltyPointsRate')
    const redeemRate = await getSetting('loyaltyRedeemRate')

    if (data.customerId && data.status === 'completed' && data.total > 0) {
      if (loyaltyRate) {
        pointsEarned = Math.floor(data.total / parseFloat(loyaltyRate))
      }
      // If paying with points, track redemption
      if (data.paymentMethod === 'points' && redeemRate) {
        pointsRedeemed = Math.floor(data.total * 100 / parseFloat(redeemRate))
      }
    }

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
        pointsEarned,
        pointsRedeemed,
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

    // Deduct stock for tracked products
    if (data.status === 'completed' || data.status === 'preparing') {
      await deductStock(data.items || [])
    }

    // Update customer loyalty points
    if (data.customerId && (pointsEarned > 0 || pointsRedeemed > 0)) {
      await prisma.customer.update({
        where: { id: data.customerId },
        data: {
          points: { increment: pointsEarned - pointsRedeemed },
          lifetimePoints: { increment: pointsEarned },
        },
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Order create error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const authErr = checkApiAuth(request); if (authErr) return authErr
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

    // Void handling — restore stock
    if (data.status === 'voided') {
      updateData.voidedAt = new Date()
      updateData.voidReason = data.voidReason || 'Voided by admin'

      // Restore stock for voided order
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      })
      if (order) {
        await restoreStock(order.items)
        // Reverse loyalty points if customer had them
        if (order.customerId && order.pointsEarned > 0) {
          await prisma.customer.update({
            where: { id: order.customerId },
            data: {
              points: { decrement: order.pointsEarned - order.pointsRedeemed },
              lifetimePoints: { decrement: order.pointsEarned },
            },
          })
        }
      }
    }

    const order = await prisma.order.update({ where: { id }, data: updateData, include: { items: true, payments: true, table: true, staff: true, customer: true } })
    return NextResponse.json(order)
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authErr = checkAdminAuth(request); if (authErr) return authErr
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

// --- Helper functions ---

/** Deduct stock for tracked products */
async function deductStock(items: { productId: string; quantity: number; pricingType?: string; weight?: number }[]) {
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (product?.trackStock) {
      const deduct = item.pricingType === 'per_unit'
        ? Math.ceil(item.weight || 0)
        : item.quantity
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: deduct } },
      })
    }
  }
}

/** Restore stock for voided/cancelled order items */
async function restoreStock(items: { productId: string; quantity: number; pricingType: string; weight: number | null }[]) {
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (product?.trackStock) {
      const restore = item.pricingType === 'per_unit'
        ? Math.ceil(item.weight || 0)
        : item.quantity
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: restore } },
      })
    }
  }
}

/** Get a setting value by key */
async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.settings.findUnique({ where: { key } })
  return setting?.value || null
}