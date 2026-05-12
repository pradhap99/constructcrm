'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationsPanel } from './NotificationsPanel'
import { CommandPalette, useCommandPaletteHotkey } from './CommandPalette'
import { UserMenu } from './UserMenu'
import { notifications as notifApi } from '@/lib/api'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'

const EXACT_TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ai-reader': 'AI Draft Reader',
  '/projects': 'Projects',
  '/leads': 'Leads',
  '/indents': 'Indents / Purchase Requests',
  '/indents/new': 'Create Indent',
  '/rfq': 'RFQ Management',
  '/vendors': 'Vendor Management',
  '/purchase-orders': 'Purchase Orders',
  '/grn': 'GRN & 3-Way Match',
  '/invoices': 'Invoices',
  '/dpr': 'Daily Progress Reports',
  '/boq': 'Bill of Quantities',
  '/submittals': 'Submittals',
  '/change-orders': 'Change Orders',
  '/billing': 'Client Billing',
  '/analytics': 'Analytics',
}

const BASE_TITLE_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  'ai-reader': 'AI Draft Reader',
  projects: 'Projects',
  leads: 'Leads',
  indents: 'Indents / Purchase Requests',
  rfq: 'RFQ Management',
  vendors: 'Vendor Management',
  'purchase-orders': 'Purchase Orders',
  grn: 'GRN & 3-Way Match',
  invoices: 'Invoices',
  dpr: 'Daily Progress Reports',
  boq: 'Bill of Quantities',
  submittals: 'Submittals',
  'change-orders': 'Change Orders',
  billing: 'Client Billing',
  analytics: 'Analytics',
}

const POLL_INTERVAL_MS = 30_000

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname()
  const [panelOpen, setPanelOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null)
  const [isMac, setIsMac] = useState(false)

  useCommandPaletteHotkey(useCallback(() => setPaletteOpen(true), []))

  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform))
    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notifApi.list()
      setNotifs(res.data)
    } catch {
      // Backend may be unavailable; fail silently
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchNotifications])

  const handleMarkSeen = useCallback(async (id: string) => {
    try {
      await notifApi.markSeen(id)
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_seen: true } : n)))
    } catch { /* silent */ }
  }, [])

  const handleMarkAllSeen = useCallback(async () => {
    try {
      await notifApi.markAllSeen()
      setNotifs((prev) => prev.map((n) => ({ ...n, is_seen: true })))
    } catch { /* silent */ }
  }, [])

  const unreadCount = notifs.filter((n) => !n.is_seen).length

  const segments = pathname.split('/').filter(Boolean)
  const title =
    EXACT_TITLE_MAP[pathname] ??
    BASE_TITLE_MAP[segments[0]] ??
    'ConstructCRM'

  const hasCritical = notifs.some((n) => !n.is_seen && n.severity === 'critical')

  return (
    <>
      <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuToggle}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block truncate">
              Home {segments.map((s, i) => (
                <span key={i}> › <span className="capitalize">{s.replace(/-/g, ' ')}</span></span>
              ))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 text-sm border rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground transition-colors w-56 text-left"
            aria-label="Open command palette"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 truncate">Search pages…</span>
            <kbd className="text-[10px] font-medium border rounded px-1 py-0.5 bg-background">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setPanelOpen(true)}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1',
                  'flex items-center justify-center',
                  'rounded-full text-[10px] font-bold text-white',
                  hasCritical ? 'bg-red-500' : 'bg-indigo-500'
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          <UserMenu user={user} />
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <NotificationsPanel
        open={panelOpen}
        items={notifs}
        onClose={() => setPanelOpen(false)}
        onMarkSeen={handleMarkSeen}
        onMarkAllSeen={handleMarkAllSeen}
      />
    </>
  )
}
