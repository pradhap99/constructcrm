import { cn } from '@/lib/utils'
import type { BillStatus } from '@/lib/zod-schemas'

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  CERTIFIED: 'Certified',
  PAID: 'Paid',
  DISPUTED: 'Disputed',
}

const STYLES: Record<BillStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  CERTIFIED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  DISPUTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
}

export function BillStatusPill({ status, className }: { status: BillStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        STYLES[status],
        className,
      )}
    >
      {BILL_STATUS_LABELS[status]}
    </span>
  )
}
