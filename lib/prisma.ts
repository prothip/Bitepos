import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Try to use LibSQL adapter (better performance), fall back to standard SQLite
  try {
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    const adapter = new PrismaLibSql({ url: `file:${path.join(process.cwd(), 'dev.db')}` })
    return new PrismaClient({ adapter })
  } catch {
    // No adapter available — use standard Prisma SQLite with DATABASE_URL
    return new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma