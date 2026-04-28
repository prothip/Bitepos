import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth, checkManagerAuth, checkAdminAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { writeFile, readFile, unlink, copyFile } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const authErr = checkApiAuth(req)
  if (authErr) return authErr
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'export') {
    const dbPath = path.join(process.cwd(), 'dev.db')
    try {
      const fileBuffer = await readFile(dbPath)
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="bitepos-backup-${new Date().toISOString().slice(0, 10)}.db"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    } catch {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 })
    }
  }

  const settings = await prisma.settings.findMany()
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const authErr = checkManagerAuth(req)
  if (authErr) return authErr
  const body = await req.json()
  const updates: Record<string, string> = body

  const operations = Object.entries(updates).map(([key, value]) =>
    prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  )

  await prisma.$transaction(operations)
  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest) {
  const authErr = checkAdminAuth(req)
  if (authErr) return authErr
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'import') {
    try {
      const formData = await req.formData()
      const file = formData.get('database') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No database file provided' }, { status: 400 })
      }

      const dbPath = path.join(process.cwd(), 'dev.db')
      const backupPath = path.join(process.cwd(), 'dev.db.backup')

      // Backup current database
      try { await copyFile(dbPath, backupPath) } catch {}

      // Write new database
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(dbPath, buffer)

      return NextResponse.json({ success: true, message: 'Database imported successfully' })
    } catch (error) {
      console.error('Database import error:', error)
      // Try to restore backup
      const dbPath = path.join(process.cwd(), 'dev.db')
      const backupPath = path.join(process.cwd(), 'dev.db.backup')
      try { await copyFile(backupPath, dbPath) } catch {}
      return NextResponse.json({ error: 'Failed to import database' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}