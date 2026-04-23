// Prepare standalone Next.js build for Electron packaging
// Copies static and public files into the standalone directory
import { cpSync, existsSync, mkdirSync } from 'fs'
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

console.log('🎉 Standalone build ready for Electron packaging')