'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2, XCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINRShort } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { advanceTenderAction, setTenderStatusAction } from '@/actions/tenders'
import { daysUntilSubmission } from './tender-status-utils'
import { ConvertToProjectModal } from './convert-to-project-modal'
import type { TenderRow } from '@/actions/tenders'

export function TenderCard({
  tender,
  clientsForPicker,
  autoOpenConvert = false,
}: {
  tender: TenderRow
  clientsForPicker: Array<{ id: string; name: string }>
  autoOpenConvert?: boolean
}) {
  const [, startTransition] = useTransition()
  const [advancing, setAdvancing] = useState(false)
  const [convertOpen, setConvertOpen] = useState(autoOpenConvert)
  const [error, setError] = useState<string | null>(null)

  const days = daysUntilSubmission(tender.submissionDate ?? null)
  const amount = Number(tender.bidValue ?? tender.estimatedValue ?? 0)
  const terminal = tender.status === 'WON' || tender.status === 'LOST'

  const advance = () => {
    setAdvancing(true)
    setError(null)
    startTransition(async () => {
      const result = await advanceTenderAction(tender.id)
      setAdvancing(false)
      if (!result.ok) {
        setError(result.error)
      } else if (result.status === 'WON') {
        setConvertOpen(true)
      }
    })
  }

  const markLost = () => {
    if (!confirm('Mark this tender as lost?')) return
    setAdvancing(true)
    setError(null)
    startTransition(async () => {
      const result = await setTenderStatusAction({ id: tender.id, status: 'LOST' })
      setAdvancing(false)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <article className="rounded-md border bg-card p-3 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-tight">{tender.name}</h3>
          {tender.clientName && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {tender.clientName}
            </p>
          )}
        </div>
        {amount > 0 && (
          <span className="shrink-0 text-xs font-semibold">{formatINRShort(amount)}</span>
        )}
      </div>

      {tender.referenceNumber && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Ref {tender.referenceNumber}
        </p>
      )}

      {days !== null && !terminal && (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold',
            days < 0
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              : days <= 7
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {days < 0
            ? `${Math.abs(days)}d overdue`
            : days === 0
              ? 'Due today'
              : `${days}d left`}
          <span className="font-normal opacity-75">· {formatDate(tender.submissionDate)}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[10px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tender.status === 'WON' && tender.convertedProjectId && (
          <Link
            href={`/projects/${tender.convertedProjectId}`}
            className="inline-flex items-center gap-1 rounded-sm border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
          >
            <ExternalLink className="h-3 w-3" />
            View project
          </Link>
        )}

        {tender.status === 'WON' && !tender.convertedProjectId && (
          <button
            type="button"
            onClick={() => setConvertOpen(true)}
            className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ArrowRight className="h-3 w-3" />
            Convert to project
          </button>
        )}

        {!terminal && (
          <button
            type="button"
            onClick={advance}
            disabled={advancing}
            className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {advancing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowRight className="h-3 w-3" />
            )}
            Move forward
          </button>
        )}

        {!terminal && (
          <button
            type="button"
            onClick={markLost}
            disabled={advancing}
            className="inline-flex items-center gap-1 rounded-sm border border-dashed border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
          >
            <XCircle className="h-3 w-3" />
            Mark lost
          </button>
        )}

        {tender.status === 'LOST' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <XCircle className="h-3 w-3" />
            Lost
          </span>
        )}

        {tender.status === 'WON' && tender.convertedProjectId && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Converted
          </span>
        )}
      </div>

      <ConvertToProjectModal
        tender={tender}
        clients={clientsForPicker}
        open={convertOpen}
        onOpenChange={setConvertOpen}
      />
    </article>
  )
}
