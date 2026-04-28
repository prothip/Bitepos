import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth, checkManagerAuth, checkAdminAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authErr = checkApiAuth(req)
  if (authErr) return authErr
  const branches = await prisma.branch.findMany({ orderBy: { isMain: 'desc' } })
  return NextResponse.json(branches)
}

export async function POST(req: NextRequest) {
  const authErr = checkAdminAuth(req)
  if (authErr) return authErr
  const data = await req.json()
  const branch = await prisma.branch.create({ data })
  return NextResponse.json(branch)
}