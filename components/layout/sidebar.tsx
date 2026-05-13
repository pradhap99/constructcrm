'use client'

import { useState } from 'react'
import {
  HardHat,
  Sun,
  Users,
  Target,
  Building2,
  Receipt,
  CalendarCheck2,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SidebarNav, type NavItem } from './sidebar-nav'
import { logoutAction } from '@/actions/auth'

type NavGroup = { label: string; items: NavItem[] }

// Phase 1 ships with placeholder labels for groups that don't yet have
// routes — items marked `comingSoon` render dimmed and are wired up in
// their respective phases (clients=Phase 2, projects=Phase 3, etc).
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [{ href: '/today', label: 'Today', icon: Sun }],
  },
  {
    label: 'Pipeline',
    items: [
      { href: '/clients', label: 'Clients', icon: Users, comingSoon: true },
      { href: '/tenders', label: 'Tenders', icon: Target, comingSoon: true },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { href: '/projects', label: 'Projects', icon: Building2, comingSoon: true },
      { href: '/bills', label: 'Bills', icon: Receipt, comingSoon: true },
    ],
  },
  {
    label: 'Insights',
    items: [{ href: '/settings', label: 'Settings', icon: Settings, comingSoon: true }],
  },
]

export function Sidebar({ user }: { user: { name: string; email: string; role: string } }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const close = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">CivilIQ</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile slide-over backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background transition-transform duration-200 ease-in-out',
          'md:sticky md:top-0 md:h-screen md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">CivilIQ</span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="rounded-md p-1.5 hover:bg-accent md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Separator />

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              <SidebarNav items={group.items} onNavigate={close} />
            </div>
          ))}
        </nav>

        <Separator />

        <div className="p-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user.role.toLowerCase()} · {user.email}
              </p>
            </div>
            <CalendarCheck2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </div>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase()
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}
