import { cn } from '@/lib/utils'
import { TENDER_STATUSES, type TenderStatus } from '@/lib/zod-schemas'
import {
  TENDER_STATUS_COLUMN_TINT,
  TENDER_STATUS_DOT,
  TENDER_STATUS_LABELS,
} from './tender-status-utils'
import { TenderCard } from './tender-card'
import type { TenderRow } from '@/actions/tenders'

export function TenderBoard({
  tenders,
  clientsForPicker,
}: {
  tenders: TenderRow[]
  clientsForPicker: Array<{ id: string; name: string }>
}) {
  const byStatus = new Map<TenderStatus, TenderRow[]>()
  for (const s of TENDER_STATUSES) byStatus.set(s, [])
  for (const t of tenders) {
    byStatus.get(t.status)?.push(t)
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
      {TENDER_STATUSES.map((status) => {
        const items = byStatus.get(status) ?? []
        return (
          <section
            key={status}
            className={cn(
              'flex min-h-[200px] flex-col gap-2 rounded-lg border p-2',
              TENDER_STATUS_COLUMN_TINT[status],
            )}
          >
            <header className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn('h-2 w-2 rounded-full', TENDER_STATUS_DOT[status])}
                />
                <h2 className="text-[10px] font-semibold uppercase tracking-widest">
                  {TENDER_STATUS_LABELS[status]}
                </h2>
              </div>
              <span className="rounded-sm bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold">
                {items.length}
              </span>
            </header>

            {items.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-center text-[10px] text-muted-foreground">
                Empty
              </p>
            ) : (
              items.map((t) => (
                <TenderCard key={t.id} tender={t} clientsForPicker={clientsForPicker} />
              ))
            )}
          </section>
        )
      })}
    </div>
  )
}
