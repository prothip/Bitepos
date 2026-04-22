'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  ClipboardList,
  Users,
  UserCheck,
  Table2,
  BarChart3,
  Settings,
  Package,
  Printer,
  ChevronRight,
  Terminal,
  ChefHat,
  Sliders,
  Rocket,
  LogOut,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { BranchSwitcher } from '@/components/BranchSwitcher'
import { useFeatureFlags } from '@/lib/use-feature-flags'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const t = useTranslations('admin')
  const pathname = usePathname()

  const locale = pathname.split('/')[1] || 'en'

  const { flags } = useFeatureFlags()

  const allNavItems = [
    { href: `/${locale}/admin`, label: t('dashboard'), icon: LayoutDashboard, feature: null },
    { href: `/${locale}/admin/products`, label: t('products'), icon: ShoppingBag, feature: null },
    { href: `/${locale}/admin/categories`, label: t('categories'), icon: Tag, feature: null },
    { href: `/${locale}/admin/orders`, label: t('orders'), icon: ClipboardList, feature: 'orders' as const },
    { href: `/${locale}/admin/customers`, label: t('customers'), icon: Users, feature: 'loyalty' as const },
    { href: `/${locale}/admin/branches`, label: t('branches'), icon: Building2, feature: null },
    { href: `/${locale}/admin/staff`, label: t('staff'), icon: UserCheck, feature: null },
    { href: `/${locale}/admin/tables`, label: t('tables'), icon: Table2, feature: 'tables' as const },
    { href: `/${locale}/admin/kds`, label: 'Kitchen Display', icon: ChefHat, feature: 'kitchenDisplay' as const },
    { href: `/${locale}/admin/inventory`, label: t('inventory'), icon: Package, feature: 'trackStock' as const },
    { href: `/${locale}/admin/printers`, label: 'Printers', icon: Printer, feature: null },
    { href: `/${locale}/admin/reports`, label: t('reports'), icon: BarChart3, feature: null },
    { href: `/${locale}/admin/settings`, label: t('settings'), icon: Settings, feature: null },
    { href: `/${locale}/admin/features`, label: 'Features', icon: Sliders, feature: null },
    { href: `/${locale}/onboarding`, label: 'Setup', icon: Rocket, feature: null },
  ]

  const navItems = allNavItems.filter(item => !item.feature || flags[item.feature])

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-secondary text-white flex flex-col shadow-xl">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">BP</span>
            </div>
            <div>
              <p className="font-bold text-sm">BitePOS</p>
              <p className="text-xs text-white/50">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== `/${locale}/admin` && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-2 py-4 border-t border-white/10">
          <Link
            href={`/${locale}/pos`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Terminal className="w-4 h-4" />
            Back to POS
          </Link>
          <button
            onClick={() => { fetch('/api/auth/logout', { method: 'POST' }); window.location.href = `/${locale}/login` }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>BitePOS</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-800 font-medium">
              {navItems.find(n => pathname === n.href || (n.href !== `/${locale}/admin` && pathname.startsWith(n.href)))?.label || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <BranchSwitcher />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
