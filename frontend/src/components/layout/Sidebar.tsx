'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Brain, Building2, Target, ClipboardList,
  FileSearch, Users, ShoppingCart, Package, Receipt,
  CalendarDays, BarChart3, FileCheck, GitBranch, Wallet, TrendingUp,
  HardHat, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/ai-reader',
    label: 'AI Draft Reader',
    icon: Brain,
    badge: '★ STAR',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  { href: '/projects', label: 'Projects', icon: Building2 },
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/indents', label: 'Indents / PR', icon: ClipboardList },
  { href: '/rfq', label: 'RFQ Management', icon: FileSearch },
  { href: '/vendors', label: 'Vendors', icon: Users },
  { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { href: '/grn', label: 'GRN', icon: Package },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/dpr', label: 'DPR', icon: CalendarDays },
  { href: '/boq', label: 'BOQ', icon: BarChart3 },
  { href: '/submittals', label: 'Submittals', icon: FileCheck },
  { href: '/change-orders', label: 'Change Orders', icon: GitBranch },
  { href: '/billing', label: 'Billing', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-slate-900 dark:bg-slate-950 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
          <HardHat className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-bold text-white text-sm">ConstructCRM</span>
            <p className="text-xs text-slate-400">Civil Intelligence</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('w-5 h-5 shrink-0', item.href === '/ai-reader' && 'text-amber-400')} />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', item.badgeClass)}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white hover:bg-indigo-600 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Footer */}
      <div className="border-t border-slate-700 px-4 py-3">
        {!collapsed && (
          <p className="text-xs text-slate-500 text-center">v0.1.0 · Production</p>
        )}
      </div>
    </aside>
  )
}
