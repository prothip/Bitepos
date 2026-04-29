import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use DATABASE_URL env var as the canonical source for the DB path.
  // In Electron, this is set by main.js to point to the correct location.
  // Fall back to process.cwd()/dev.db if not set.
  const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`

  // Try to use LibSQL adapter (better performance)
  try {
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    // DATABASE_URL is like "file:/path/to/dev.db" — extract the path
    const dbPath = dbUrl.replace(/^file:/, '')
    const adapter = new PrismaLibSql({ url: `file:${dbPath}` })
    return new PrismaClient({ adapter })
  } catch {
    // No adapter available — use standard Prisma SQLite with DATABASE_URL
    return new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma