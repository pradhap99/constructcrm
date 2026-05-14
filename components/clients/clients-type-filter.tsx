'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CLIENT_TYPES, type ClientType } from '@/lib/zod-schemas'

const PILLS: Array<{ value: 'All' | ClientType; label: string }> = [
  { value: 'All', label: 'All' },
  ...CLIENT_TYPES.map((t) => ({ value: t, label: t })),
]

export function ClientsTypeFilter() {
  const params = useSearchParams()
  const current = params.get('type') ?? 'All'

  return (
    <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto px-1 pb-1">
      {PILLS.map((pill) => {
        const active = current === pill.value
        const next = new URLSearchParams(params.toString())
        if (pill.value === 'All') next.delete('type')
        else next.set('type', pill.value)
        const qs = next.toString()
        const href = qs ? `/clients?${qs}` : '/clients'

        return (
          <Link
            key={pill.value}
            href={href}
            scroll={false}
            replace
            className={cn(
              'inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {pill.label}
          </Link>
        )
      })}
    </div>
  )
}
