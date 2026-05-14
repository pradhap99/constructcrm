import type { TenderStatus } from '@/lib/zod-schemas'

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  EOI: 'EOI',
  BIDDING: 'Bidding',
  SUBMITTED: 'Submitted',
  EVALUATION: 'Evaluation',
  WON: 'Won',
  LOST: 'Lost',
}

export const TENDER_STATUS_COLUMN_TINT: Record<TenderStatus, string> = {
  EOI: 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
  BIDDING: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
  SUBMITTED:
    'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950',
  EVALUATION:
    'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
  WON:
    'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950',
  LOST: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950',
}

export const TENDER_STATUS_DOT: Record<TenderStatus, string> = {
  EOI: 'bg-slate-400',
  BIDDING: 'bg-blue-500',
  SUBMITTED: 'bg-indigo-500',
  EVALUATION: 'bg-amber-500',
  WON: 'bg-emerald-500',
  LOST: 'bg-rose-500',
}

/** Days remaining until the submission deadline. Negative if past due. */
export function daysUntilSubmission(submissionDate: string | null): number | null {
  if (!submissionDate) return null
  const d = new Date(submissionDate)
  if (Number.isNaN(d.getTime())) return null
  const diff = d.getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}
