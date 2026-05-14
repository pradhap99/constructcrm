'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { bills, projects, tenants, clients } from '@/lib/db/schema'
import { getCurrentTenant, requireWritable } from '@/lib/tenant'
import { computeBill, isBillOverdue } from '@/lib/bill-math'
import {
  BillCreateSchema,
  BillStatusSchema,
  type BillStatus,
} from '@/lib/zod-schemas'

type CreateState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null

const optionalNumber = (raw: FormDataEntryValue | null, fallback = 0): number => {
  if (typeof raw !== 'string' || raw.length === 0) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export async function createBillAction(
  _: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const { tenantId } = await requireWritable()

  const parsed = BillCreateSchema.safeParse({
    projectId: formData.get('projectId'),
    billNumber: formData.get('billNumber'),
    billDate: formData.get('billDate'),
    grossAmount: optionalNumber(formData.get('grossAmount')),
    gstRate: optionalNumber(formData.get('gstRate')),
    tdsRate: optionalNumber(formData.get('tdsRate')),
    retentionRate: optionalNumber(formData.get('retentionRate')),
    mobAdvanceRecovery: optionalNumber(formData.get('mobAdvanceRecovery')),
    otherDeductions: optionalNumber(formData.get('otherDeductions')),
    attachmentUrl: formData.get('attachmentUrl') || undefined,
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, parsed.data.projectId), eq(projects.tenantId, tenantId)),
    columns: { id: true },
  })
  if (!project) return { ok: false, error: 'That project is not in your workspace' }

  const computed = computeBill({
    grossAmount: parsed.data.grossAmount,
    gstRate: parsed.data.gstRate,
    tdsRate: parsed.data.tdsRate,
    retentionRate: parsed.data.retentionRate,
    mobAdvanceRecovery: parsed.data.mobAdvanceRecovery,
    otherDeductions: parsed.data.otherDeductions,
  })

  try {
    const [row] = await db
      .insert(bills)
      .values({
        tenantId,
        projectId: parsed.data.projectId,
        billNumber: parsed.data.billNumber,
        billDate: parsed.data.billDate,
        grossAmount: computed.grossAmount.toFixed(2),
        gstRate: computed.gstRate.toFixed(2),
        gstAmount: computed.gstAmount.toFixed(2),
        tdsRate: computed.tdsRate.toFixed(2),
        tdsAmount: computed.tdsAmount.toFixed(2),
        retentionRate: computed.retentionRate.toFixed(2),
        retentionAmount: computed.retentionAmount.toFixed(2),
        mobAdvanceRecovery: computed.mobAdvanceRecovery.toFixed(2),
        otherDeductions: computed.otherDeductions.toFixed(2),
        netAmount: computed.netAmount.toFixed(2),
        attachmentUrl: parsed.data.attachmentUrl,
        notes: parsed.data.notes,
      })
      .returning({ id: bills.id })

    if (!row) return { ok: false, error: 'Could not create bill' }

    revalidatePath('/bills')
    revalidatePath(`/projects/${parsed.data.projectId}`)
    return { ok: true, id: row.id }
  } catch (error) {
    const msg = (error as Error).message ?? ''
    if (msg.includes('bills_tenant_number_uq')) {
      return { ok: false, error: 'A bill with that number already exists' }
    }
    console.error('createBillAction', error)
    return { ok: false, error: 'Could not create bill' }
  }
}

// ── Status transitions ──────────────────────────────────────────────────────

const TransitionSchema = z.object({
  id: z.string().uuid(),
  to: BillStatusSchema,
  submittedDate: z.string().optional(),
  certifiedAmount: z.number().nonnegative().optional(),
  certifiedDate: z.string().optional(),
  paidAmount: z.number().nonnegative().optional(),
  paidDate: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
})

const ALLOWED_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  DRAFT: ['SUBMITTED', 'DISPUTED'],
  SUBMITTED: ['CERTIFIED', 'DISPUTED'],
  CERTIFIED: ['PAID', 'DISPUTED'],
  PAID: [],
  DISPUTED: [],
}

export async function transitionBillStatusAction(
  input: z.infer<typeof TransitionSchema>,
): Promise<{ ok: true; status: BillStatus } | { ok: false; error: string }> {
  const parsed = TransitionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  const { tenantId } = await requireWritable()

  const existing = await db.query.bills.findFirst({
    where: and(eq(bills.id, parsed.data.id), eq(bills.tenantId, tenantId)),
    columns: { id: true, status: true, projectId: true },
  })
  if (!existing) return { ok: false, error: 'Bill not found' }
  if (!ALLOWED_TRANSITIONS[existing.status].includes(parsed.data.to)) {
    return { ok: false, error: `Cannot move ${existing.status} → ${parsed.data.to}` }
  }

  const patch: Partial<typeof bills.$inferInsert> = {
    status: parsed.data.to,
    updatedAt: new Date(),
  }

  switch (parsed.data.to) {
    case 'SUBMITTED':
      if (!parsed.data.submittedDate) return { ok: false, error: 'Submission date is required' }
      patch.submittedDate = parsed.data.submittedDate
      break
    case 'CERTIFIED':
      if (parsed.data.certifiedAmount === undefined) {
        return { ok: false, error: 'Certified amount is required' }
      }
      if (!parsed.data.certifiedDate) {
        return { ok: false, error: 'Certified date is required' }
      }
      patch.certifiedAmount = parsed.data.certifiedAmount.toFixed(2)
      patch.certifiedDate = parsed.data.certifiedDate
      break
    case 'PAID':
      if (parsed.data.paidAmount === undefined) {
        return { ok: false, error: 'Paid amount is required' }
      }
      if (!parsed.data.paidDate) return { ok: false, error: 'Paid date is required' }
      patch.paidAmount = parsed.data.paidAmount.toFixed(2)
      patch.paidDate = parsed.data.paidDate
      break
    case 'DISPUTED':
      if (!parsed.data.notes || parsed.data.notes.length === 0) {
        return { ok: false, error: 'A note explaining the dispute is required' }
      }
      patch.notes = parsed.data.notes
      break
    case 'DRAFT':
      return { ok: false, error: 'Cannot revert to DRAFT' }
  }

  await db
    .update(bills)
    .set(patch)
    .where(and(eq(bills.id, parsed.data.id), eq(bills.tenantId, tenantId)))

  revalidatePath('/bills')
  revalidatePath(`/projects/${existing.projectId}`)
  return { ok: true, status: parsed.data.to }
}

export async function deleteBillAction(id: string): Promise<void> {
  z.string().uuid().parse(id)
  const { tenantId } = await requireWritable()
  await db.delete(bills).where(and(eq(bills.id, id), eq(bills.tenantId, tenantId)))
  revalidatePath('/bills')
}

// ── Read helpers ────────────────────────────────────────────────────────────

export type BillRow = typeof bills.$inferSelect & {
  projectName: string
  projectCode: string
  clientId: string
  clientName: string
}

export async function listBillsForTenant(opts: {
  status?: string | null
  projectId?: string
  clientId?: string
} = {}): Promise<BillRow[]> {
  const { tenantId } = await getCurrentTenant()
  const conds = [eq(bills.tenantId, tenantId)]
  if (opts.projectId) conds.push(eq(bills.projectId, opts.projectId))
  if (opts.clientId) conds.push(eq(projects.clientId, opts.clientId))

  // "Overdue" is computed; everything else maps to a status enum.
  if (opts.status && opts.status !== 'All' && opts.status !== 'Overdue') {
    const parsed = BillStatusSchema.safeParse(opts.status)
    if (parsed.success) conds.push(eq(bills.status, parsed.data))
  }

  const rows = await db
    .select({
      bill: bills,
      projectName: projects.name,
      projectCode: projects.code,
      clientId: projects.clientId,
      clientName: clients.name,
    })
    .from(bills)
    .innerJoin(projects, eq(bills.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(...conds))
    .orderBy(desc(bills.updatedAt))
    .limit(500)

  const mapped: BillRow[] = rows.map((r) => ({
    ...r.bill,
    projectName: r.projectName,
    projectCode: r.projectCode,
    clientId: r.clientId,
    clientName: r.clientName,
  }))

  if (opts.status === 'Overdue') {
    return mapped.filter((b) =>
      isBillOverdue({
        status: b.status,
        submittedDate: b.submittedDate,
        certifiedDate: b.certifiedDate,
      }),
    )
  }
  return mapped
}

export async function getBillById(id: string): Promise<BillRow | null> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return null
  const { tenantId } = await getCurrentTenant()
  const rows = await db
    .select({
      bill: bills,
      projectName: projects.name,
      projectCode: projects.code,
      clientId: projects.clientId,
      clientName: clients.name,
    })
    .from(bills)
    .innerJoin(projects, eq(bills.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(bills.id, parsed.data), eq(bills.tenantId, tenantId)))
    .limit(1)
  const first = rows[0]
  if (!first) return null
  return {
    ...first.bill,
    projectName: first.projectName,
    projectCode: first.projectCode,
    clientId: first.clientId,
    clientName: first.clientName,
  }
}

export async function listProjectsForBillPicker(): Promise<
  Array<{ id: string; name: string; code: string; clientName: string }>
> {
  const { tenantId } = await getCurrentTenant()
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      code: projects.code,
      clientName: clients.name,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.tenantId, tenantId))
    .orderBy(asc(projects.name))
    .limit(500)
  return rows
}

export type TenantBillDefaults = {
  gstRate: number
  tdsRate: number
  retentionRate: number
}

export async function getTenantBillDefaults(): Promise<TenantBillDefaults> {
  const { tenantId } = await getCurrentTenant()
  const row = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { defaultGstRate: true, defaultTdsRate: true, defaultRetentionRate: true },
  })
  return {
    gstRate: Number(row?.defaultGstRate ?? 18),
    tdsRate: Number(row?.defaultTdsRate ?? 2),
    retentionRate: Number(row?.defaultRetentionRate ?? 5),
  }
}

/**
 * Suggested next bill number for a given project: `RA-{N+1}` where N is the
 * highest existing `RA-{n}` number on that project. Falls back to RA-001.
 */
export async function suggestNextBillNumber(projectId: string): Promise<string> {
  if (!projectId) return 'RA-001'
  const parsed = z.string().uuid().safeParse(projectId)
  if (!parsed.success) return 'RA-001'
  const { tenantId } = await getCurrentTenant()
  const rows = await db
    .select({ billNumber: bills.billNumber })
    .from(bills)
    .where(and(eq(bills.tenantId, tenantId), eq(bills.projectId, parsed.data)))

  let max = 0
  for (const r of rows) {
    const m = r.billNumber.match(/^RA-(\d+)$/i)
    if (m && m[1]) {
      const n = Number(m[1])
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `RA-${String(max + 1).padStart(3, '0')}`
}

/** Counts for the filter pills' "(N)" badges. */
export async function getBillStatusCounts(): Promise<Record<BillStatus | 'Overdue' | 'All', number>> {
  const { tenantId } = await getCurrentTenant()
  const rows = await db
    .select({ status: bills.status, count: count() })
    .from(bills)
    .where(eq(bills.tenantId, tenantId))
    .groupBy(bills.status)

  const out: Record<BillStatus | 'Overdue' | 'All', number> = {
    All: 0,
    DRAFT: 0,
    SUBMITTED: 0,
    CERTIFIED: 0,
    PAID: 0,
    DISPUTED: 0,
    Overdue: 0,
  }
  for (const r of rows) {
    out[r.status as BillStatus] = Number(r.count) || 0
    out.All += Number(r.count) || 0
  }

  // Overdue is a computed predicate (SUBMITTED >15d or CERTIFIED >30d).
  // Compute via a single date-bounded count.
  const fifteenDaysAgo = new Date(Date.now() - 15 * 86_400_000).toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

  const [overdueRow] = await db
    .select({ count: count() })
    .from(bills)
    .where(
      and(
        eq(bills.tenantId, tenantId),
        sql`(
          (${bills.status} = 'SUBMITTED' AND ${bills.submittedDate} IS NOT NULL AND ${bills.submittedDate} < ${fifteenDaysAgo})
          OR
          (${bills.status} = 'CERTIFIED' AND ${bills.certifiedDate} IS NOT NULL AND ${bills.certifiedDate} < ${thirtyDaysAgo})
        )`,
      ),
    )
  out.Overdue = Number(overdueRow?.count ?? 0) || 0

  return out
}
