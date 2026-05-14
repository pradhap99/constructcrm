'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

/** Debounced search-by-name input that mutates `?q=` in place. */
export function ProjectsSearch() {
  const router = useRouter()
  const params = useSearchParams()
  const initial = params.get('q') ?? ''
  const [value, setValue] = useState(initial)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setValue(initial)
  }, [initial])

  useEffect(() => {
    const trimmed = value.trim()
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      const qs = next.toString()
      startTransition(() => {
        router.replace(qs ? `/projects?${qs}` : '/projects')
      })
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search projects by name…"
        className="h-9 pl-9 pr-9"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
