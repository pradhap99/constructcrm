import { z } from 'zod'

/**
 * Indian RA-bill tax math. Pure, deterministic, no I/O.
 * Ported verbatim from the rebuild branch's lib/bill-math.ts so we can share
 * the same engine + tests. Components must NEVER recompute net amounts —
 * always call computeBill().
 *
 * net = gross + GST − TDS − retention − mobAdvance − other
 *
 * - GST is added ON TOP of gross.
 * - TDS is deducted FROM gross — typically 2 % u/s 194C for contractors.
 * - Retention is deducted FROM gross — typically 5–10 %, released later.
 * - Mob-advance recovery is deducted per the contract recovery schedule.
 * - Other deductions: penalties, water/electricity charges, etc.
 *
 * All currency is in rupees with 2-decimal precision.
 */

export const BillInputSchema = z.object({
  grossAmount: z.number().nonnegative(),
  gstRate: z.number().min(0).max(50),
  tdsRate: z.number().min(0).max(50),
  retentionRate: z.number().min(0).max(50),
  mobAdvanceRecovery: z.number().nonnegative().default(0),
  otherDeductions: z.number().nonnegative().default(0),
})

export type BillInput = z.infer<typeof BillInputSchema>

export interface BillComputed extends BillInput {
  gstAmount: number
  tdsAmount: number
  retentionAmount: number
  netAmount: number
}

export function computeBill(input: BillInput): BillComputed {
  const parsed = BillInputSchema.parse(input)
  const round = (n: number) => Math.round(n * 100) / 100

  const gstAmount = round((parsed.grossAmount * parsed.gstRate) / 100)
  const tdsAmount = round((parsed.grossAmount * parsed.tdsRate) / 100)
  const retentionAmount = round((parsed.grossAmount * parsed.retentionRate) / 100)

  const netAmount = round(
    parsed.grossAmount +
      gstAmount -
      tdsAmount -
      retentionAmount -
      parsed.mobAdvanceRecovery -
      parsed.otherDeductions,
  )

  return { ...parsed, gstAmount, tdsAmount, retentionAmount, netAmount }
}

/** Days a bill has aged in its current status. 0 if reference date is missing. */
export function billAgingDays(bill: {
  status: string
  submittedDate: string | null | undefined
  certifiedDate: string | null | undefined
}): number {
  const ref =
    bill.status === 'certified' && bill.certifiedDate
      ? new Date(bill.certifiedDate)
      : bill.status === 'submitted' && bill.submittedDate
        ? new Date(bill.submittedDate)
        : null
  if (!ref || Number.isNaN(ref.getTime())) return 0
  return Math.floor((Date.now() - ref.getTime()) / 86_400_000)
}

export type AgingBucket = 'normal' | 'watch' | 'overdue' | 'critical'

export function agingBucket(days: number): AgingBucket {
  if (days <= 15) return 'normal'
  if (days <= 30) return 'watch'
  if (days <= 60) return 'overdue'
  return 'critical'
}

/** True if a bill is overdue per the §7.1 rule (CERTIFIED >30d OR SUBMITTED >15d). */
export function isBillOverdue(bill: {
  status: string
  submittedDate: string | null | undefined
  certifiedDate: string | null | undefined
}): boolean {
  const aging = billAgingDays(bill)
  if (bill.status === 'certified') return aging > 30
  if (bill.status === 'submitted') return aging > 15
  return false
}
