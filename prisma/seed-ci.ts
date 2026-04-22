import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding production database...')

  const hash = await bcrypt.hash('1234', 10)
  const mhash = await bcrypt.hash('5678', 10)

  const branch = await prisma.branch.create({
    data: {
      name: 'Main Branch',
      slug: 'main',
      isMain: true,
      isActive: true,
      timezone: 'Asia/Bangkok',
      taxRate: 7,
    },
  })

  await prisma.staff.create({
    data: {
      name: 'Admin',
      email: 'admin@bitepos.local',
      pin: hash,
      role: 'admin',
      isActive: true,
      branchId: branch.id,
    },
  })

  await prisma.staff.create({
    data: {
      name: 'Manager',
      email: 'manager@bitepos.local',
      pin: mhash,
      role: 'manager',
      isActive: true,
      branchId: branch.id,
    },
  })

  const settings = [
    { key: 'shopName', value: 'My Shop' },
    { key: 'taxRate', value: '7' },
    { key: 'defaultVatMode', value: 'exclusive' },
    { key: 'currency', value: 'THB' },
    { key: 'receiptFooter', value: 'Thank you for your purchase!' },
  ]

  for (const s of settings) {
    await prisma.settings.create({ data: s })
  }

  console.log('✅ Production DB seeded!')
  console.log('   Admin PIN: 1234')
  console.log('   Manager PIN: 5678')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})