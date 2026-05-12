'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { User, LogOut, Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type CurrentUser = { full_name: string; email: string; role: string } | null

export function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    router.push('/login')
  }

  const initials = (user?.full_name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || 'U'

  const themes: { value: 'light' | 'dark' | 'system'; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
          {user ? initials : <User className="w-4 h-4" />}
        </div>
        <div className="hidden md:block text-sm text-left">
          <p className="font-medium leading-none truncate max-w-[140px]">{user?.full_name ?? 'User'}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{user?.role ?? ''}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border bg-popover text-popover-foreground shadow-lg overflow-hidden z-50"
        >
          <div className="px-3 py-3 border-b">
            <p className="text-sm font-medium truncate">{user?.full_name ?? 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? '—'}</p>
            {user?.role && (
              <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300 rounded px-1.5 py-0.5">
                {user.role}
              </span>
            )}
          </div>

          <div className="px-2 py-2 border-b">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 pb-1">
              Theme
            </p>
            <div className="flex gap-1">
              {themes.map(t => {
                const Icon = t.icon
                const active = theme === t.value || (!theme && t.value === 'system')
                return (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-1.5 rounded-md text-[11px] transition-colors',
                      active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>
            {theme === 'system' && (
              <p className="text-[10px] text-muted-foreground px-2 pt-1.5">
                Currently {resolvedTheme}.
              </p>
            )}
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
