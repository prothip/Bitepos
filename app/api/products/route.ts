import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// GET /api/products?action=export → download Excel file
// POST /api/products?action=import → upload Excel file
export async function GET(req: NextRequest) {
  const authErr = checkApiAuth(req || (null as any)); if (authErr) return authErr
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'export') {
    return handleExport()
  }

  // Default: list products
  const { searchParams } = new URL(req.url)
  const includeInactive = searchParams.get('active') !== 'true'
  const products = await prisma.product.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { category: true },
    orderBy: { nameEn: 'asc' },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const authErr = checkApiAuth(req || (null as any)); if (authErr) return authErr
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'import') {
    return handleImport(req)
  }

  // Default: create product
  const data = await req.json()
  const product = await prisma.product.create({ data })
  return NextResponse.json(product, { status: 201 })
}

async function handleExport(): Promise<NextResponse> {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { nameEn: 'asc' },
  })

  const rows = products.map(p => ({
    ID: p.id,
    SKU: p.sku || '',
    Barcode: p.barcode || '',
    'Name (EN)': p.nameEn,
    'Name (TH)': p.nameTh,
    'Name (MY)': p.nameMy,
    'Name (ZH)': p.nameZh,
    'Description (EN)': p.descriptionEn || '',
    'Price': p.price,
    'Cost Price': p.costPrice || '',
    'Category': p.category?.nameEn || '',
    'Pricing Type': p.pricingType,
    'Unit': p.unit || '',
    'Track Stock': p.trackStock ? 'Yes' : 'No',
    'Stock Qty': p.stockQty,
    'Low Stock Alert': p.lowStockAlert,
    'VAT Mode': p.vatMode,
    'Favorite': p.isFavorite ? 'Yes' : 'No',
    'Active': p.isActive ? 'Yes' : 'No',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Set column widths
  ws['!cols'] = [
    { wch: 28 }, // ID
    { wch: 12 }, // SKU
    { wch: 15 }, // Barcode
    { wch: 25 }, // Name EN
    { wch: 25 }, // Name TH
    { wch: 25 }, // Name MY
    { wch: 25 }, // Name ZH
    { wch: 30 }, // Description
    { wch: 10 }, // Price
    { wch: 10 }, // Cost
    { wch: 15 }, // Category
    { wch: 12 }, // Pricing Type
    { wch: 6 },  // Unit
    { wch: 10 }, // Track Stock
    { wch: 10 }, // Stock Qty
    { wch: 12 }, // Low Stock
    { wch: 10 }, // VAT
    { wch: 8 },  // Favorite
    { wch: 8 },  // Active
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Products')

  // Add categories sheet for reference
  const categories = await prisma.category.findMany({ orderBy: { nameEn: 'asc' } })
  const catRows = categories.map(c => ({
    'Category Name (EN)': c.nameEn,
    'Category Name (TH)': c.nameTh,
    'Category Name (MY)': c.nameMy,
    'Category Name (ZH)': c.nameZh,
    'Color': c.color,
  }))
  const ws2 = XLSX.utils.json_to_sheet(catRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Categories')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bitepos-products-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}

async function handleImport(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // Get categories for lookup
    const categories = await prisma.category.findMany()
    const catMap = new Map(categories.map(c => [c.nameEn.toLowerCase(), c.id]))

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const nameEn = String(row['Name (EN)'] || '').trim()
      if (!nameEn) { skipped++; continue }

      const price = parseFloat(String(row['Price'] || '0'))
      if (price <= 0) { errors.push(`Row ${i + 2}: Missing or invalid Price`); skipped++; continue }

      const catName = String(row['Category'] || '').trim().toLowerCase()
      const categoryId = catMap.get(catName)
      if (!categoryId) { errors.push(`Row ${i + 2}: Category "${row['Category']}" not found`); skipped++; continue }

      const sku = String(row['SKU'] || '').trim() || null
      const existing = sku ? await prisma.product.findUnique({ where: { sku } }) : null

      const data = {
        nameEn,
        nameTh: String(row['Name (TH)'] || ''),
        nameMy: String(row['Name (MY)'] || ''),
        nameZh: String(row['Name (ZH)'] || ''),
        descriptionEn: String(row['Description (EN)'] || '') || null,
        price,
        costPrice: parseFloat(String(row['Cost Price'] || '0')) || null,
        categoryId,
        sku,
        barcode: String(row['Barcode'] || '').trim() || null,
        pricingType: String(row['Pricing Type'] || 'per_item'),
        unit: String(row['Unit'] || '').trim() || null,
        trackStock: String(row['Track Stock'] || '').toLowerCase() === 'yes',
        stockQty: parseInt(String(row['Stock Qty'] || '0')) || 0,
        lowStockAlert: parseInt(String(row['Low Stock Alert'] || '5')) || 5,
        vatMode: String(row['VAT Mode'] || 'exclusive'),
        isFavorite: String(row['Favorite'] || '').toLowerCase() === 'yes',
        isActive: String(row['Active'] || 'yes').toLowerCase() === 'yes',
      }

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data })
        updated++
      } else {
        await prisma.product.create({ data })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Product import error:', error)
    return NextResponse.json({ error: 'Failed to import products' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const authErr = checkApiAuth(req || (null as any)); if (authErr) return authErr
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data = await req.json()
  const updateData: Record<string, unknown> = {}

  const fields = ['nameEn', 'nameTh', 'nameMy', 'nameZh', 'descriptionEn', 'descriptionMy', 'descriptionZh', 'descriptionTh', 'barcode', 'imageUrl', 'pricingType', 'unit', 'vatMode']
  fields.forEach(f => { if (data[f] !== undefined) updateData[f] = data[f] })

  if (data.price !== undefined) updateData.price = parseFloat(data.price)
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice ? parseFloat(data.costPrice) : null
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
  if (data.sku !== undefined) updateData.sku = data.sku || null
  if (data.trackStock !== undefined) updateData.trackStock = data.trackStock
  if (data.stockQty !== undefined) updateData.stockQty = parseInt(data.stockQty)
  if (data.lowStockAlert !== undefined) updateData.lowStockAlert = parseInt(data.lowStockAlert)
  if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.stepWeight !== undefined) updateData.stepWeight = data.stepWeight ? parseFloat(data.stepWeight) : null

  const product = await prisma.product.update({ where: { id }, data: updateData })
  return NextResponse.json(product)
}

export async function DELETE(req: NextRequest) {
  const authErr = checkApiAuth(req || (null as any)); if (authErr) return authErr
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ success: true })
}