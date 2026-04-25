const Database = require('better-sqlite3')
const path = require('path')
const bcrypt = require('bcryptjs')

const db = new Database(path.join(process.cwd(), 'dev.db'))

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')

console.log('Setting up fresh database for production...')

// Hash default PINs with bcrypt
const adminPinHash = bcrypt.hashSync('1234', 10)
const managerPinHash = bcrypt.hashSync('5678', 10)

// Create main branch (INSERT OR IGNORE for idempotency)
db.prepare(`
  INSERT OR IGNORE INTO Branch (id, name, slug, isMain, isActive, timezone, taxRate, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`).run('main-branch', 'Main Branch', 'main', 1, 1, 'Asia/Bangkok', 7)

// Create default admin staff (bcrypt-hashed PIN)
db.prepare(`
  INSERT OR IGNORE INTO Staff (id, name, email, pin, role, isActive, branchId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`).run('admin-staff', 'Admin', 'admin@bitepos.app', adminPinHash, 'admin', 1, 'main-branch')

// Create default manager staff (bcrypt-hashed PIN)
db.prepare(`
  INSERT OR IGNORE INTO Staff (id, name, email, pin, role, isActive, branchId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`).run('manager-staff', 'Manager', 'manager@bitepos.app', managerPinHash, 'manager', 1, 'main-branch')

// Default settings
const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO Settings (id, key, value, updatedAt)
  VALUES (?, ?, ?, datetime('now'))
`)

const settings = [
  ['setting-shopName', 'shopName', 'My Shop'],
  ['setting-taxRate', 'taxRate', '7'],
  ['setting-defaultVatMode', 'defaultVatMode', 'exclusive'],
  ['setting-currency', 'currency', 'THB'],
  ['setting-pointsPerBaht', 'pointsPerBaht', '1'],
  ['setting-redeemRate', 'redeemRate', '100'],
  ['setting-receiptFooter', 'receiptFooter', 'Thank you for your purchase!'],
]

for (const [id, key, value] of settings) {
  insertSetting.run(id, key, value)
}

db.close()

console.log('✅ Production database ready!')
console.log('   Admin PIN: 1234')
console.log('   Manager PIN: 5678')
console.log('   → Change these PINs after first login!')