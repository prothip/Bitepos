import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth, checkAdminAuth } from '@/lib/with-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  const authErr = checkApiAuth(request)
  if (authErr) return authErr
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    // Validate file extension
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `File type .${ext} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), buffer)

    const url = `/uploads/${filename}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}