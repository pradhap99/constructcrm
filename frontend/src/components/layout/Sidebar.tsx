'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Brain, Building2, Target, ClipboardList,
  FileSearch, Users, ShoppingCart, Package, Receipt,
  CalendarDays, BarChart3, FileCheck, GitBranch, Wallet,
  TrendingUp, HardHat, ChevronLeft, ChevronRight,
  LogOut, Layers, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: string; badgeClass?: string }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        href: '/ai-reader', label: 'AI Draft Reader', icon: Brain,
        badge: '★ AI', badgeClass: 'bg-amber-100 text-amber-700',
      },
      { href: '/analytics', label: 'Analytics', icon: TrendingUp },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/projects', label: 'Projects', icon: Building2 },
      { href: '/leads', label: 'Leads', icon: Target },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { href: '/indents', label: 'Indents / PR', icon: ClipboardList },
      { href: '/rfq', label: 'RFQ', icon: FileSearch },
      { href: '/vendors', label: 'Vendors', icon: Users },
      { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
      { href: '/grn', label: 'GRN', icon: Package },
    ],
  },
  {
    label: 'Site & Quality',
    items: [
      { href: '/dpr', label: 'DPR', icon: CalendarDays },
      { href: '/boq', label: 'BOQ', icon: BarChart3 },
      { href: '/materials', label: 'Materials', icon: Layers },
      { href: '/submittals', label: 'Submittals', icon: FileCheck },
      { href: '/change-orders', label: 'Change Orders', icon: GitBranch },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/invoices', label: 'Invoices', icon: Receipt },
      { href: '/billing', label: 'Billing', icon: Wallet },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (label: string) =>
    setCollapsedGroups(p => ({ ...p, [label]: !p[label] }))

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-slate-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700/60">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shrink-0">
          <HardHat className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">ConstructCRM</p>
            <p className="text-xs text-slate-400">Civil Intelligence</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-700">
        {NAV_GROUPS.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.label]
          const hasActive = group.items.some(
            item => pathname === item.href || pathname.startsWith(item.href + '/')
          )

          return (
            <div key={group.label} className="mb-1">
              {/* Group header */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 py-1.5 mb-0.5 group"
                >
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-widest transition-colors',
                    hasActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
                  )}>
                    {group.label}
                  </span>
                  <ChevronDown className={cn(
                    'w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-transform',
                    isGroupCollapsed && '-rotate-90'
                  )} />
                </button>
              )}

              {/* Group items */}
              {(!isGroupCollapsed || collapsed) && group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn(
                      'w-4 h-4 shrink-0',
                      item.href === '/ai-reader' && !isActive && 'text-amber-400'
                    )} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', item.badgeClass)}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white hover:bg-indigo-600 transition-colors z-10 shadow"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* User + Logout */}
      <div className="border-t border-slate-700/60 px-2 py-3">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all',
            'text-slate-400 hover:bg-red-900/30 hover:text-red-400'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
        {!collapsed && (
          <p className="text-[10px] text-slate-600 text-center pt-1.5">v0.1.0</p>
        )}
      </div>
    </aside>
  )
}
