#!/bin/bash
# Reset database for production packaging
# Run this before building the Electron app

set -e
cd "$(dirname "$0")/.."

echo "🔄 Resetting database for production..."

# Delete old database
rm -f dev.db dev.db.backup dev.db-journal dev.db-wal

# Run Prisma migration (creates fresh empty DB with schema)
npx prisma db push --accept-data-loss

# Seed with production defaults
npx tsx prisma/seed-prod.js

echo ""
echo "✅ Done! Database is clean and ready for production."
echo "   Default PINs: Admin=1234, Manager=5678"
echo "   ⚠️  Remind customer to change PINs after first login!"