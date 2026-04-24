// Prepare standalone Next.js build for Electron packaging
// Copies static, public, prisma, and DB files into the standalone directory
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
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

// Fix server.js: replace hardcoded absolute paths with relative paths
// and fix DATABASE_URL to use __dirname-relative path
const serverJs = join(standaloneDir, 'server.js')
if (existsSync(serverJs)) {
  let content = readFileSync(serverJs, 'utf8')
  
  // Remove any previously injected DATABASE_URL line (from older builds)
  content = content.replace(/process\.env\.DATABASE_URL\s*=\s*process\.env\.DATABASE_URL\s*\|\|\s*[^;]+;\n?/g, '')
  
  // Add DATABASE_URL that uses __dirname (relative to where server.js lives)
  // This works because dev.db is in the same directory as server.js
  content = `process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:' + require('path').join(__dirname, 'dev.db');\n${content}`
  
  writeFileSync(serverJs, content)
  console.log('✅ Fixed DATABASE_URL in server.js to use __dirname-relative path')
}

console.log('🎉 Standalone build ready for Electron packaging')