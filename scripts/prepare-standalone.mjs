// Prepare standalone Next.js build for Electron packaging
// Copies static, public, prisma, and DB files into the standalone directory
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = process.cwd()
const standaloneDir = join(root, '.next', 'standalone')
const staticDir = join(root, '.next', 'static')
const publicDir = join(root, 'public')

if (!existsSync(standaloneDir)) {
  console.error('❌ .next/standalone not found. Run `next build` first.')
  process.exit(1)
}

// Copy .next/static into .next/standalone/.next/static
const standaloneNextDir = join(standaloneDir, '.next')
if (!existsSync(standaloneNextDir)) {
  mkdirSync(standaloneNextDir, { recursive: true })
}
cpSync(staticDir, join(standaloneNextDir, 'static'), { recursive: true })
console.log('✅ Copied .next/static → .next/standalone/.next/static')

// Copy public folder into standalone
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standaloneDir, 'public'), { recursive: true })
  console.log('✅ Copied public → .next/standalone/public')
}

// Copy prisma schema and DB into standalone
const prismaDir = join(root, 'prisma')
if (existsSync(prismaDir)) {
  cpSync(prismaDir, join(standaloneDir, 'prisma'), { recursive: true })
  console.log('✅ Copied prisma → .next/standalone/prisma')
}

const dbFile = join(root, 'dev.db')
if (existsSync(dbFile)) {
  cpSync(dbFile, join(standaloneDir, 'dev.db'))
  console.log('✅ Copied dev.db → .next/standalone/dev.db')
}

// Ensure standalone server.js has proper DATABASE_URL handling
// The standalone server needs to know where the DB is
const serverJs = join(standaloneDir, 'server.js')
if (existsSync(serverJs)) {
  let content = require('fs').readFileSync(serverJs, 'utf8')
  // Add DATABASE_URL fallback if not present
  if (!content.includes('DATABASE_URL')) {
    const dbPathFallback = `file:${join(standaloneDir, 'dev.db').replace(/\\/g, '/')}`
    content = `process.env.DATABASE_URL = process.env.DATABASE_URL || '${dbPathFallback}';\n${content}`
    writeFileSync(serverJs, content)
    console.log('✅ Added DATABASE_URL fallback to server.js')
  }
}

console.log('🎉 Standalone build ready for Electron packaging')