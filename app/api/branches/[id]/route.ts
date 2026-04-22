import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkApiAuth(req); if (authErr) return authErr
  const { id } = await params
  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(branch)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkApiAuth(req); if (authErr) return authErr
  const { id } = await params
  const data = await req.json()
  // Prevent deactivating main branch
  if (data.isActive === false) {
    const branch = await prisma.branch.findUnique({ where: { id } })
    if (branch?.isMain) return NextResponse.json({ error: 'Cannot deactivate main branch' }, { status: 400 })
  }
  // Prevent unsetting isMain on main branch
  if (data.isMain === false) {
    const branch = await prisma.branch.findUnique({ where: { id } })
    if (branch?.isMain) return NextResponse.json({ error: 'Cannot unset main branch' }, { status: 400 })
  }
  const updated = await prisma.branch.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkApiAuth(req); if (authErr) return authErr
  const { id } = await params
  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (branch.isMain) return NextResponse.json({ error: 'Cannot delete main branch' }, { status: 400 })
  await prisma.branch.delete({ where: { id } })
  return NextResponse.json({ success: true })
}