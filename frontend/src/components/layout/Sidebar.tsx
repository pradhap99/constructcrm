'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HardHat, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_GROUPS } from '@/lib/nav'
import { useEffect, useState } from 'react'

const COLLAPSED_KEY = 'sidebar_collapsed'
const GROUPS_KEY = 'sidebar_collapsed_groups'

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
      const raw = localStorage.getItem(GROUPS_KEY)
      if (raw) setCollapsedGroups(JSON.parse(raw))
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(collapsedGroups)) } catch { /* ignore */ }
  }, [collapsedGroups, hydrated])

  const toggleGroup = (label: string) =>
    setCollapsedGroups(p => ({ ...p, [label]: !p[label] }))

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
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Footer */}
      <div className="border-t border-slate-700/60 px-2 py-3">
        {!collapsed && (
          <p className="text-[10px] text-slate-600 text-center">v0.1.0</p>
        )}
      </div>
    </aside>
  )
}
