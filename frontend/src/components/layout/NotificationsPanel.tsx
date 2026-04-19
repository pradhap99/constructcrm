'use client'

import { useEffect, useRef } from 'react'
import { X, AlertTriangle, AlertCircle, Info, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { notifications as notifApi } from '@/lib/api'
import type { Notification } from '@/lib/types'

interface NotificationsPanelProps {
  open: boolean
  items: Notification[]
  onClose: () => void
  onMarkSeen: (id: string) => void
  onMarkAllSeen: () => void
}

function severityConfig(severity: Notification['severity']) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        row: 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30',
        icon_class: 'text-red-500',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        label: 'CRITICAL',
      }
    case 'warning':
      return {
        icon: AlertTriangle,
        row: 'border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30',
        icon_class: 'text-amber-500',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
        label: 'WARNING',
      }
    default:
      return {
        icon: Info,
        row: 'border-l-4 border-slate-300 bg-slate-50 dark:bg-slate-800/50',
        icon_class: 'text-slate-400',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
        label: 'INFO',
      }
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationsPanel({
  open,
  items,
  onClose,
  onMarkSeen,
  onMarkAllSeen,
}: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onClose])

  const unread = items.filter((n) => !n.is_seen)

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-in-out border-l border-border',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Notifications</h2>
            {unread.length > 0 && (
              <p className="text-xs text-muted-foreground">{unread.length} unread</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread.length > 0 && (
              <button
                onClick={onMarkAllSeen}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                All read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Info className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            items.map((n) => {
              const cfg = severityConfig(n.severity)
              const Icon = cfg.icon
              return (
                <button
                  key={n.id}
                  onClick={() => !n.is_seen && onMarkSeen(n.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 transition-opacity',
                    cfg.row,
                    n.is_seen ? 'opacity-50' : 'hover:brightness-95 cursor-pointer'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.icon_class)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', cfg.badge)}>
                          {cfg.label}
                        </span>
                        {n.project_name && (
                          <span className="text-[10px] text-muted-foreground truncate">{n.project_name}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_seen && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
