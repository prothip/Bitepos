// Fix Prisma v7 #imports resolution on Windows CI
// The generated .prisma/client/default.js uses require('#main-entry-point')
// which breaks on Windows with Node.js v22. Patch it to use a direct path.
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const generatedDir = join(process.cwd(), 'node_modules', '.prisma', 'client')
const defaultJs = join(generatedDir, 'default.js')

try {
  const content = readFileSync(defaultJs, 'utf8')
  if (content.includes('#main-entry-point')) {
    writeFileSync(defaultJs, content.replace(
      /require\('#main-entry-point'\)/g,
      "require('./index.js')"
    ))
    console.log('✅ Patched .prisma/client/default.js to use direct require')
  } else {
    console.log('ℹ️  .prisma/client/default.js already patched or different format')
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('ℹ️  .prisma/client/default.js not found yet (will be generated)')
  } else {
    console.error('⚠️  Could not patch .prisma/client/default.js:', err.message)
  }
}

// Also patch @prisma/client/default.js if it exists
const clientDefaultJs = join(process.cwd(), 'node_modules', '@prisma', 'client', 'default.js')
try {
  const content = readFileSync(clientDefaultJs, 'utf8')
  if (content.includes("require('.prisma/client/default')")) {
    writeFileSync(clientDefaultJs, content.replace(
      /require\('\.prisma\/client\/default'\)/g,
      "require('../../.prisma/client/index.js')"
    ))
    console.log('✅ Patched @prisma/client/default.js to bypass #imports')
  }
} catch (err) {
  // non-critical
}