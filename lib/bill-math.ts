import { z } from 'zod'

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

/**
 * Indian RA-bill math.
 *
 * Net = Gross + GST − TDS − Retention − Mobilisation-advance recovery − Other
 *
 * GST is added ON TOP of gross.
 * TDS is deducted FROM gross — typically 2% u/s 194C for contractors.
 * Retention is deducted FROM gross — typically 5–10%, released later.
 * Mob-advance recovery is deducted per the contract recovery schedule.
 * Other deductions: penalties, water/electricity charges, etc.
 *
 * All currency is in rupees with 2-decimal precision. Use this everywhere —
 * never recompute net amounts in components.
 */
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

/** Days a bill has aged in its current status. 0 if reference date missing. */
export function billAgingDays(bill: {
  status: string
  submittedDate: string | null
  certifiedDate: string | null
}): number {
  const ref =
    bill.status === 'CERTIFIED' && bill.certifiedDate
      ? new Date(bill.certifiedDate)
      : bill.status === 'SUBMITTED' && bill.submittedDate
        ? new Date(bill.submittedDate)
        : null
  if (!ref || Number.isNaN(ref.getTime())) return 0
  return Math.floor((Date.now() - ref.getTime()) / 86_400_000)
}

export type AgingBucket = 'normal' | 'watch' | 'overdue' | 'critical'

/** Aging bucket for Today screen sorting. */
export function agingBucket(days: number): AgingBucket {
  if (days <= 15) return 'normal'
  if (days <= 30) return 'watch'
  if (days <= 60) return 'overdue'
  return 'critical'
}

/** True if a bill is overdue per the dashboard rule (CERTIFIED >30d or SUBMITTED >15d). */
export function isBillOverdue(bill: {
  status: string
  submittedDate: string | null
  certifiedDate: string | null
}): boolean {
  const aging = billAgingDays(bill)
  if (bill.status === 'CERTIFIED') return aging > 30
  if (bill.status === 'SUBMITTED') return aging > 15
  return false
}
