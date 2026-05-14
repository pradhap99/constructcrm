'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, ChevronDown, Loader2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BillStatusPill, BILL_STATUS_LABELS } from './bill-status-pill'
import { transitionBillStatusAction } from '@/actions/bills'
import { todayISO } from '@/lib/date'
import type { BillStatus } from '@/lib/zod-schemas'

const NEXT: Record<BillStatus, BillStatus | null> = {
  DRAFT: 'SUBMITTED',
  SUBMITTED: 'CERTIFIED',
  CERTIFIED: 'PAID',
  PAID: null,
  DISPUTED: null,
}

/**
 * Inline status changer per §7.5. No modal — uses a Radix Popover that
 * collects the minimal fields each transition needs:
 *   DRAFT → SUBMITTED: submittedDate (default today)
 *   SUBMITTED → CERTIFIED: certifiedAmount + certifiedDate
 *   CERTIFIED → PAID: paidAmount + paidDate
 *   Any → DISPUTED: notes (required)
 */
export function BillStatusChanger({
  billId,
  initial,
  netAmount,
  onChanged,
}: {
  billId: string
  initial: BillStatus
  netAmount: number
  onChanged?: (next: BillStatus) => void
}) {
  const [status, setStatus] = useState<BillStatus>(initial)
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<BillStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  const submit = (payload: {
    to: BillStatus
    submittedDate?: string
    certifiedAmount?: number
    certifiedDate?: string
    paidAmount?: number
    paidDate?: string
    notes?: string
  }) => {
    setSaving(true)
    setError(null)
    startTransition(async () => {
      const result = await transitionBillStatusAction({ id: billId, ...payload })
      setSaving(false)
      if (result.ok) {
        setStatus(result.status)
        setOpen(false)
        setTarget(null)
        onChanged?.(result.status)
      } else {
        setError(result.error)
      }
    })
  }

  const terminal = NEXT[status] === null
  const nextForward = NEXT[status]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={terminal}
          aria-label={`Bill status: ${BILL_STATUS_LABELS[status]}`}
        >
          <BillStatusPill status={status} />
          {!terminal && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        {!target ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Move to
            </p>
            {nextForward && (
              <button
                type="button"
                onClick={() => setTarget(nextForward)}
                className="flex w-full items-center justify-between rounded-md border bg-card px-3 py-2 text-sm hover:bg-accent"
              >
                <span>{BILL_STATUS_LABELS[nextForward]}</span>
                <span className="text-[10px] text-muted-foreground">→</span>
              </button>
            )}
            {status !== 'DISPUTED' && status !== 'PAID' && (
              <button
                type="button"
                onClick={() => setTarget('DISPUTED')}
                className="flex w-full items-center justify-between rounded-md border border-dashed border-border bg-card px-3 py-2 text-sm hover:border-rose-300 hover:text-rose-600"
              >
                <span>Disputed</span>
                <span className="text-[10px] text-muted-foreground">⚠</span>
              </button>
            )}
          </div>
        ) : (
          <TransitionForm
            target={target}
            netAmount={netAmount}
            onCancel={() => setTarget(null)}
            onSubmit={submit}
            saving={saving}
            error={error}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

type TransitionPayload = {
  to: BillStatus
  submittedDate?: string
  certifiedAmount?: number
  certifiedDate?: string
  paidAmount?: number
  paidDate?: string
  notes?: string
}

function TransitionForm({
  target,
  netAmount,
  onCancel,
  onSubmit,
  saving,
  error,
}: {
  target: BillStatus
  netAmount: number
  onCancel: () => void
  onSubmit: (payload: TransitionPayload) => void
  saving: boolean
  error: string | null
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        if (target === 'SUBMITTED') {
          onSubmit({ to: 'SUBMITTED', submittedDate: String(fd.get('submittedDate') ?? '') })
        } else if (target === 'CERTIFIED') {
          onSubmit({
            to: 'CERTIFIED',
            certifiedAmount: Number(fd.get('certifiedAmount') ?? 0),
            certifiedDate: String(fd.get('certifiedDate') ?? ''),
          })
        } else if (target === 'PAID') {
          onSubmit({
            to: 'PAID',
            paidAmount: Number(fd.get('paidAmount') ?? 0),
            paidDate: String(fd.get('paidDate') ?? ''),
          })
        } else if (target === 'DISPUTED') {
          onSubmit({ to: 'DISPUTED', notes: String(fd.get('notes') ?? '') })
        }
      }}
      className="space-y-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {target === 'DISPUTED' ? 'Mark as disputed' : `Move to ${BILL_STATUS_LABELS[target]}`}
      </p>

      {target === 'SUBMITTED' && (
        <div className="space-y-1.5">
          <Label htmlFor="submittedDate" className="text-xs">
            Submitted on
          </Label>
          <Input
            id="submittedDate"
            name="submittedDate"
            type="date"
            required
            defaultValue={todayISO()}
            className="h-8 text-xs"
          />
        </div>
      )}

      {target === 'CERTIFIED' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="certifiedAmount" className="text-xs">
              Certified amount (₹)
            </Label>
            <Input
              id="certifiedAmount"
              name="certifiedAmount"
              type="number"
              required
              min={0}
              step={0.01}
              defaultValue={netAmount}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="certifiedDate" className="text-xs">
              Certified on
            </Label>
            <Input
              id="certifiedDate"
              name="certifiedDate"
              type="date"
              required
              defaultValue={todayISO()}
              className="h-8 text-xs"
            />
          </div>
        </>
      )}

      {target === 'PAID' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="paidAmount" className="text-xs">
              Paid amount (₹)
            </Label>
            <Input
              id="paidAmount"
              name="paidAmount"
              type="number"
              required
              min={0}
              step={0.01}
              defaultValue={netAmount}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paidDate" className="text-xs">
              Paid on
            </Label>
            <Input
              id="paidDate"
              name="paidDate"
              type="date"
              required
              defaultValue={todayISO()}
              className="h-8 text-xs"
            />
          </div>
        </>
      )}

      {target === 'DISPUTED' && (
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs">
            Why?
          </Label>
          <Textarea
            id="notes"
            name="notes"
            required
            placeholder="Short reason — quantity mismatch, certification pending, etc."
            className="min-h-[60px] text-xs"
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-1 text-[10px] text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Back
        </Button>
        <Button type="submit" size="sm" disabled={saving} className="gap-1">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          Confirm
        </Button>
      </div>
    </form>
  )
}
