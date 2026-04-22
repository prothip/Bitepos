# BitePOS POS — Full-Feature Point of Sale + Admin Panel

> **Status:** Under Discussion
> **Date:** 2026-04-12
> **Project:** BitePOS POS (Thai Baht, Multi-language)

## Key Decisions (Locked)
- Deployment: Electron desktop app (.exe) — local, offline-capable
- Card terminal: Mock/simulation only
- PromptPay QR: Mock QR code display
- VAT mode: Both inclusive & exclusive — configurable, default exclusive
- Myanmar fonts: Noto Sans Myanmar webfont bundled
- Backup: Manual SQLite export/import from Settings

## Tech Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + SQLite (offline-first)
- i18next / next-intl for multilingual
- Zustand for POS terminal state
- Recharts for admin charts
- ESC/POS for receipt printing
- Electron for desktop packaging

## Core Features (Priority Order)
1. POS Terminal: Product grid, order builder, cash/card/mobile payment, receipt print
2. Admin Panel: Dashboard, products CRUD, orders, reports
3. Multi-language: EN, MY, ZH, TH with Thai Baht currency
4. VAT: Both inclusive and exclusive modes
5. Table layout, KDS mode, hold/retrieve orders (defer KDS if time-constrained)

## Multi-language Keys (all 4 languages required)
- pos.*, admin.*, common.*, orders.*, products.*, errors.*

## Data Model
Category, Product, ProductVariant, ModifierGroup, Modifier, Table, Staff, Customer, Order, OrderItem, Payment, Discount, DailyReport, Settings

## Start from Task 1: Project Scaffolding
Install deps, set up Next.js + TypeScript + Tailwind + Prisma + SQLite + i18n + Zustand + Recharts
