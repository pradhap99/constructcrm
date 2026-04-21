'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sun, Moon, Bell, Search, User, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { NotificationsPanel } from './NotificationsPanel'
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
  const { theme, setTheme } = useTheme()
  const [panelOpen, setPanelOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null)

  useEffect(() => {
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

  return (
    <>
      <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b bg-background">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuToggle}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Home {segments.map((s, i) => (
              <span key={i}> › <span className="capitalize">{s.replace(/-/g, ' ')}</span></span>
            ))}
          </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search..."
              className="pl-9 pr-4 py-1.5 text-sm border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-ring w-48"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Bell with unread badge */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setPanelOpen(true)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1',
                  'flex items-center justify-center',
                  'rounded-full text-[10px] font-bold text-white',
                  unreadCount > 0 && notifs.some((n) => !n.is_seen && n.severity === 'critical')
                    ? 'bg-red-500'
                    : 'bg-indigo-500'
                )}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          <div className="flex items-center gap-2 ml-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block text-sm">
              <p className="font-medium leading-none">{user?.full_name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
            </div>
          </div>
        </div>
      </header>

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
