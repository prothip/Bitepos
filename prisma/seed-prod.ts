import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

const adapter = new PrismaLibSql({ url: `file:${path.join(process.cwd(), 'dev.db')}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Setting up fresh database for production...')

  // Create main branch
  const branch = await prisma.branch.upsert({
    where: { slug: 'main' },
    update: {},
    create: {
      name: 'Main Branch',
      slug: 'main',
      isMain: true,
      isActive: true,
      timezone: 'Asia/Bangkok',
      taxRate: 7,
    },
  })

  // Create default admin staff
  await prisma.staff.upsert({
    where: { email: 'admin@bitepos.app' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@bitepos.app',
      pin: '1234',
      role: 'admin',
      isActive: true,
      branchId: branch.id,
    },
  })

  // Create default manager staff
  await prisma.staff.upsert({
    where: { email: 'manager@bitepos.app' },
    update: {},
    create: {
      name: 'Manager',
      email: 'manager@bitepos.app',
      pin: '5678',
      role: 'manager',
      isActive: true,
      branchId: branch.id,
    },
  })

  // Default settings
  const defaultSettings = [
    { key: 'shopName', value: 'My Shop' },
    { key: 'taxRate', value: '7' },
    { key: 'defaultVatMode', value: 'exclusive' },
    { key: 'currency', value: 'THB' },
    { key: 'pointsPerBaht', value: '1' },
    { key: 'redeemRate', value: '100' },
    { key: 'receiptFooter', value: 'Thank you for your purchase!' },
  ]

  for (const s of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  console.log('✅ Production database ready!')
  console.log('   Admin PIN: 1234')
  console.log('   Manager PIN: 5678')
  console.log('   → Change these PINs after first login!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })