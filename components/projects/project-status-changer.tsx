'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/zod-schemas'
import { PROJECT_STATUS_LABELS } from './project-status-badge'
import { updateProjectStatusAction } from '@/actions/projects'

/**
 * Inline status select that doubles as a status pill. Clicking the pill
 * reveals a dropdown; picking a value fires the Server Action and updates
 * the local state optimistically.
 */
export function ProjectStatusChanger({
  projectId,
  initial,
}: {
  projectId: string
  initial: ProjectStatus
}) {
  const [status, setStatus] = useState<ProjectStatus>(initial)
  const [saving, startTransition] = useTransition()
  const [savedFlash, setSavedFlash] = useState(false)

  const change = (next: ProjectStatus) => {
    if (next === status) return
    const prev = status
    setStatus(next)
    startTransition(async () => {
      const result = await updateProjectStatusAction({ id: projectId, status: next })
      if (!result.ok) {
        setStatus(prev)
      } else {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1200)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="project-status">
        Status
      </label>
      <div className="relative">
        <select
          id="project-status"
          value={status}
          disabled={saving}
          onChange={(e) => change(e.target.value as ProjectStatus)}
          className={cn(
            'h-7 appearance-none rounded-full border bg-background pl-2.5 pr-7 text-[10px] font-semibold uppercase tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-ring',
            STATUS_BG[status],
          )}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-background text-foreground normal-case">
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
      </div>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {savedFlash && !saving && (
        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      )}
    </div>
  )
}

const STATUS_BG: Record<ProjectStatus, string> = {
  AWARDED: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  IN_PROGRESS:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ON_HOLD: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  COMPLETED:
    'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CANCELLED:
    'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
}
