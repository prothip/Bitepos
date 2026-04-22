#!/bin/bash
# Build and publish BitePOS update
# Usage: bash scripts/publish-update.sh [version]
#
# Prerequisites:
#   1. Set up an update server (see docs below)
#   2. Update the version in package.json
#   3. Run this script
#
# Update server options:
#   - GitHub Releases: Change publish provider to "github" in .electron-builder.json
#   - Custom server:   Upload the files in dist/ to your web server
#   - S3:              Change publish provider to "s3" in .electron-builder.json

set -e
cd "$(dirname "$0")/.."

VERSION="${1}"

if [ -n "$VERSION" ]; then
  echo "📌 Setting version to $VERSION"
  npm version "$VERSION" --no-git-tag-version
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Building BitePOS v${CURRENT_VERSION}..."

# Build Next.js
echo "→ Building Next.js..."
npx next build

# Build Electron
echo "→ Building Electron app..."
npx electron-builder --win --publish always

echo ""
echo "✅ Build complete! v${CURRENT_VERSION}"
echo ""
echo "📁 Output: dist/"
echo ""
echo "⚠️  To distribute updates, upload these files to your update server:"
echo "   - dist/latest.yml           (Windows update manifest)"
echo "   - dist/BitePOS POS Setup*.exe (Installer)"
echo "   - dist/BitePOS POS Setup*.blockmap (Delta updates)"
echo ""
echo "   Your update server URL is set in .electron-builder.json → publish.url"