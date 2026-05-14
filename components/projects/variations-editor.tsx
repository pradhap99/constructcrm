'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VARIATION_STATUSES, type ProjectVariation } from '@/lib/zod-schemas'
import { updateProjectVariationsAction } from '@/actions/projects'
import { formatINRShort } from '@/lib/currency'
import { todayISO } from '@/lib/date'

const STATUS_LABELS: Record<(typeof VARIATION_STATUSES)[number], string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

type Status = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Inline-edit variations list. Click "Add variation" to append a row. On
 * blur of any field the whole list is persisted to projects.variations
 * (JSONB column). Matches the §8 "no save buttons" convention.
 */
export function VariationsEditor({
  projectId,
  initial,
}: {
  projectId: string
  initial: ProjectVariation[]
}) {
  const [items, setItems] = useState<ProjectVariation[]>(initial)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const persist = (next: ProjectVariation[]) => {
    setStatus('saving')
    setError(null)
    startTransition(async () => {
      const result = await updateProjectVariationsAction({ id: projectId, variations: next })
      if (result.ok) {
        setItems(result.variations)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1200)
      } else {
        setStatus('error')
        setError(result.error)
      }
    })
  }

  const update = (index: number, patch: Partial<ProjectVariation>) => {
    setItems((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    )
  }

  const addVariation = () => {
    setItems((prev) => [
      ...prev,
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: '',
        value: 0,
        status: 'DRAFT',
        date: todayISO(),
      },
    ])
  }

  const removeVariation = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    persist(next)
  }

  const total = items.reduce((sum, v) => sum + (Number.isFinite(v.value) ? v.value : 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Variations
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {items.length} variation{items.length === 1 ? '' : 's'} · Total{' '}
            <span className="font-medium text-foreground">{formatINRShort(total)}</span>
          </p>
        </div>
        <SaveIndicator status={status} />
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {items.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
          No variations yet. Add the first scope change above the original contract.
        </div>
      )}

      <ul className="space-y-3">
        {items.map((v, i) => (
          <li key={v.id} className="rounded-md border bg-card p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="space-y-1 sm:col-span-5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Description
                </Label>
                <Input
                  value={v.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  onBlur={() => persist(items)}
                  placeholder="Extra shoring for slab S-12"
                  className="h-8 text-xs"
                  maxLength={400}
                />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Value (₹)
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  step={1}
                  value={Number.isFinite(v.value) ? v.value : 0}
                  onChange={(e) =>
                    update(i, { value: e.target.valueAsNumber || 0 })
                  }
                  onBlur={() => persist(items)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Status
                </Label>
                <select
                  value={v.status}
                  onChange={(e) => {
                    const next = items.map((row, j) =>
                      j === i
                        ? { ...row, status: e.target.value as ProjectVariation['status'] }
                        : row,
                    )
                    setItems(next)
                    persist(next)
                  }}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {VARIATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Date
                </Label>
                <Input
                  type="date"
                  value={v.date}
                  onChange={(e) => update(i, { date: e.target.value })}
                  onBlur={() => persist(items)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => removeVariation(i)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addVariation}
        className="gap-1.5"
      >
        <Plus className="h-3 w-3" />
        Add variation
      </Button>
    </div>
  )
}

function SaveIndicator({ status }: { status: Status }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" /> Saved
      </span>
    )
  }
  return null
}
