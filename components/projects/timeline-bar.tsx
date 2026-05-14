import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/date'
import type { ProjectStatus } from '@/lib/zod-schemas'

/**
 * "% elapsed" bar for a project timeline. Completed projects always show
 * 100%; cancelled projects render dimmed. Pure presentation, no client JS.
 */
export function TimelineBar({
  startDate,
  endDate,
  status,
  showLabels = true,
  className,
}: {
  startDate: string | Date
  endDate: string | Date
  status: ProjectStatus
  showLabels?: boolean
  className?: string
}) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()

  let pct: number
  if (status === 'COMPLETED') pct = 100
  else if (Number.isNaN(start) || Number.isNaN(end) || end <= start) pct = 0
  else pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100))

  const dimmed = status === 'CANCELLED' || status === 'ON_HOLD'
  const barColor =
    status === 'COMPLETED'
      ? 'bg-emerald-500'
      : status === 'ON_HOLD'
        ? 'bg-amber-400'
        : status === 'CANCELLED'
          ? 'bg-rose-400'
          : 'bg-primary'

  return (
    <div className={cn('space-y-1', dimmed && 'opacity-60', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatDate(startDate)}</span>
          <span>{pct.toFixed(0)}% elapsed</span>
          <span>{formatDate(endDate)}</span>
        </div>
      )}
    </div>
  )
}
