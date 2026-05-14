'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/zod-schemas'
import { PROJECT_STATUS_LABELS } from './project-status-badge'

const PILLS: Array<{ value: 'All' | ProjectStatus; label: string }> = [
  { value: 'All', label: 'All' },
  ...PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] })),
]

export function ProjectsStatusFilter() {
  const params = useSearchParams()
  const current = params.get('status') ?? 'All'

  return (
    <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto px-1 pb-1">
      {PILLS.map((pill) => {
        const active = current === pill.value
        const next = new URLSearchParams(params.toString())
        if (pill.value === 'All') next.delete('status')
        else next.set('status', pill.value)
        const qs = next.toString()
        const href = qs ? `/projects?${qs}` : '/projects'
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
