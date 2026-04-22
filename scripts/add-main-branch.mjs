import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const adapter = new PrismaLibSql({ url: `file:${path.join(process.cwd(), 'dev.db')}` })
const prisma = new PrismaClient({ adapter })

async function run() {
  const main = await prisma.branch.create({ 
    data: { name: 'Main Branch', slug: 'main', isMain: true, isActive: true } 
  })
  console.log('Created branch:', main.id)

  const t = await prisma.table.updateMany({ data: { branchId: main.id }})
  console.log('Tables updated:', t.count)

  const s = await prisma.staff.updateMany({ data: { branchId: main.id }})
  console.log('Staff updated:', s.count)

  const o = await prisma.order.updateMany({ data: { branchId: main.id }})
  console.log('Orders updated:', o.count)

  const r = await prisma.dailyReport.updateMany({ data: { branchId: main.id }})
  console.log('Reports updated:', r.count)

  const products = await prisma.product.findMany()
  let bp = 0
  for (const prod of products) {
    await prisma.branchProduct.create({ 
      data: { branchId: main.id, productId: prod.id, stockQty: prod.stockQty, isAvailable: true }
    })
    bp++
  }
  console.log('BranchProducts created:', bp)
  await prisma.$disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })