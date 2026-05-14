'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BILL_STATUSES, type BillStatus } from '@/lib/zod-schemas'
import { BILL_STATUS_LABELS } from './bill-status-pill'

const PILLS: Array<{ value: 'All' | BillStatus | 'Overdue'; label: string }> = [
  { value: 'All', label: 'All' },
  ...BILL_STATUSES.map((s) => ({ value: s, label: BILL_STATUS_LABELS[s] })),
  { value: 'Overdue', label: 'Overdue' },
]

export function BillsFilterPills({
  counts,
}: {
  counts: Record<BillStatus | 'Overdue' | 'All', number>
}) {
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
        const href = qs ? `/bills?${qs}` : '/bills'
        const count = counts[pill.value] ?? 0
        const warn = pill.value === 'Overdue' && count > 0
        return (
          <Link
            key={pill.value}
            href={href}
            scroll={false}
            replace
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : warn
                  ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <span>{pill.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  'rounded-sm px-1 text-[9px] font-bold',
                  active
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
