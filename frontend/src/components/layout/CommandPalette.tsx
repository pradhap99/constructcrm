'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CornerDownLeft } from 'lucide-react'
import { ALL_NAV_ITEMS, type NavItem } from '@/lib/nav'
import { cn } from '@/lib/utils'

const RECENTS_KEY = 'cmdk_recents'
const MAX_RECENTS = 4

function loadRecents(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function score(item: NavItem, q: string): number {
  if (!q) return 0
  const hay = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase()
  const needle = q.toLowerCase()
  if (item.label.toLowerCase().startsWith(needle)) return 100
  if (hay.includes(needle)) return 50
  let i = 0
  for (const ch of needle) {
    const found = hay.indexOf(ch, i)
    if (found < 0) return 0
    i = found + 1
  }
  return 10
}

export function CommandPalette({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(0)
  const [recents, setRecents] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setSelected(0)
      setRecents(loadRecents())
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo<NavItem[]>(() => {
    if (!q.trim()) {
      const recentSet = new Set(recents)
      const recentItems = recents
        .map(href => ALL_NAV_ITEMS.find(i => i.href === href))
        .filter((i): i is NavItem => Boolean(i))
      const rest = ALL_NAV_ITEMS.filter(i => !recentSet.has(i.href))
      return [...recentItems, ...rest]
    }
    return ALL_NAV_ITEMS
      .map(i => ({ item: i, s: score(i, q) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ item }) => item)
  }, [q, recents])

  useEffect(() => { setSelected(0) }, [q])

  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected, open])

  const choose = (item: NavItem) => {
    try {
      const next = [item.href, ...loadRecents().filter(h => h !== item.href)].slice(0, MAX_RECENTS)
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch { /* ignore */ }
    onOpenChange(false)
    router.push(item.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[selected]
      if (item) choose(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative w-full max-w-xl rounded-xl border bg-background shadow-2xl overflow-hidden"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 px-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, e.g. invoices, vendor, ai reader…"
            className="flex-1 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-medium text-muted-foreground border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {!q.trim() && recents.length > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-2 pb-1">
              Recent
            </p>
          )}
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No matches for &ldquo;{q}&rdquo;.
            </p>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon
              const active = idx === selected
              const showRecentDivider =
                !q.trim() && idx === Math.min(recents.length, MAX_RECENTS) && recents.length > 0
              return (
                <div key={item.href}>
                  {showRecentDivider && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pt-2 pb-1">
                      All pages
                    </p>
                  )}
                  <button
                    data-idx={idx}
                    type="button"
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => choose(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                      active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', item.badgeClass)}>
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="border-t px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="border rounded px-1">↑</kbd>
            <kbd className="border rounded px-1">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border rounded px-1">↵</kbd>
            select
          </span>
        </div>
      </div>
    </div>
  )
}

export function useCommandPaletteHotkey(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onOpen])
}
