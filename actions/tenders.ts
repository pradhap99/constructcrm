'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, ilike, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { tenders, projects, clients } from '@/lib/db/schema'
import { getCurrentTenant, requireWritable } from '@/lib/tenant'
import {
  TenderCreateSchema,
  TenderStatusSchema,
  TENDER_FORWARD_PATH,
  type TenderStatus,
} from '@/lib/zod-schemas'

type CreateState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null

const optionalNumber = (raw: FormDataEntryValue | null): number | undefined => {
  if (typeof raw !== 'string' || raw.length === 0) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export async function createTenderAction(
  _: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const { tenantId } = await requireWritable()

  const parsed = TenderCreateSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    clientId: formData.get('clientId') || undefined,
    estimatedValue: optionalNumber(formData.get('estimatedValue')),
    bidValue: optionalNumber(formData.get('bidValue')),
    status: formData.get('status') || 'EOI',
    submissionDate: formData.get('submissionDate'),
    referenceNumber: formData.get('referenceNumber'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  if (parsed.data.clientId) {
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, parsed.data.clientId), eq(clients.tenantId, tenantId)),
      columns: { id: true },
    })
    if (!client) return { ok: false, error: 'That client is not in your workspace' }
  }

  const [row] = await db
    .insert(tenders)
    .values({
      tenantId,
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      type: parsed.data.type,
      estimatedValue: parsed.data.estimatedValue?.toFixed(2),
      bidValue: parsed.data.bidValue?.toFixed(2),
      status: parsed.data.status,
      submissionDate: parsed.data.submissionDate,
      referenceNumber: parsed.data.referenceNumber,
      notes: parsed.data.notes,
    })
    .returning({ id: tenders.id })

  if (!row) return { ok: false, error: 'Could not create tender' }
  revalidatePath('/tenders')
  if (parsed.data.clientId) revalidatePath(`/clients/${parsed.data.clientId}`)
  return { ok: true, id: row.id }
}

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: TenderStatusSchema,
})

export async function setTenderStatusAction(
  input: z.infer<typeof StatusSchema>,
): Promise<{ ok: true; status: TenderStatus } | { ok: false; error: string }> {
  const parsed = StatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid status' }
  const { tenantId } = await requireWritable()

  const patch: Partial<typeof tenders.$inferInsert> = {
    status: parsed.data.status,
    updatedAt: new Date(),
  }
  // Record submission timestamp the first time we enter SUBMITTED — useful
  // for the "days left until decision" badge on the Kanban.
  if (parsed.data.status === 'SUBMITTED') {
    const existing = await db.query.tenders.findFirst({
      where: and(eq(tenders.id, parsed.data.id), eq(tenders.tenantId, tenantId)),
      columns: { submissionDate: true },
    })
    if (!existing?.submissionDate) {
      patch.submissionDate = new Date().toISOString().slice(0, 10)
    }
  }

  await db
    .update(tenders)
    .set(patch)
    .where(and(eq(tenders.id, parsed.data.id), eq(tenders.tenantId, tenantId)))

  revalidatePath('/tenders')
  revalidatePath(`/tenders/${parsed.data.id}`)
  return { ok: true, status: parsed.data.status }
}

/** Advance the tender one stop along the EOI→…→WON path. */
export async function advanceTenderAction(
  id: string,
): Promise<{ ok: true; status: TenderStatus } | { ok: false; error: string }> {
  z.string().uuid().parse(id)
  const { tenantId } = await requireWritable()
  const row = await db.query.tenders.findFirst({
    where: and(eq(tenders.id, id), eq(tenders.tenantId, tenantId)),
    columns: { status: true },
  })
  if (!row) return { ok: false, error: 'Tender not found' }
  const next = TENDER_FORWARD_PATH[row.status]
  if (!next) return { ok: false, error: 'Already in a terminal status' }
  return setTenderStatusAction({ id, status: next })
}

const NotesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(2000).nullable(),
})

export async function updateTenderNotesAction(
  input: z.infer<typeof NotesSchema>,
): Promise<void> {
  const parsed = NotesSchema.parse(input)
  const { tenantId } = await requireWritable()
  await db
    .update(tenders)
    .set({ notes: parsed.notes ?? null, updatedAt: new Date() })
    .where(and(eq(tenders.id, parsed.id), eq(tenders.tenantId, tenantId)))
}

const ConvertSchema = z.object({
  tenderId: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(1).max(40),
  contractValue: z.number().nonnegative().max(9_999_999_999_999.99),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
})

export async function convertTenderToProjectAction(
  input: z.infer<typeof ConvertSchema>,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const parsed = ConvertSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return { ok: false, error: 'End date must be after start date' }
  }
  const { tenantId } = await requireWritable()

  // Verify clientId belongs to this tenant.
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, parsed.data.clientId), eq(clients.tenantId, tenantId)),
    columns: { id: true },
  })
  if (!client) return { ok: false, error: 'That client is not in your workspace' }

  // Verify tender is in this tenant and WON (and not already converted).
  const tender = await db.query.tenders.findFirst({
    where: and(eq(tenders.id, parsed.data.tenderId), eq(tenders.tenantId, tenantId)),
    columns: { id: true, status: true, convertedProjectId: true },
  })
  if (!tender) return { ok: false, error: 'Tender not found' }
  if (tender.status !== 'WON') return { ok: false, error: 'Only WON tenders can convert' }
  if (tender.convertedProjectId) {
    return { ok: false, error: 'This tender was already converted' }
  }

  try {
    const projectId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(projects)
        .values({
          tenantId,
          clientId: parsed.data.clientId,
          name: parsed.data.name,
          code: parsed.data.code,
          contractValue: parsed.data.contractValue.toFixed(2),
          status: 'AWARDED',
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
        })
        .returning({ id: projects.id })
      if (!row) throw new Error('insert returned nothing')

      await tx
        .update(tenders)
        .set({ convertedProjectId: row.id, updatedAt: new Date() })
        .where(and(eq(tenders.id, parsed.data.tenderId), eq(tenders.tenantId, tenantId)))

      return row.id
    })

    revalidatePath('/projects')
    revalidatePath('/tenders')
    revalidatePath(`/clients/${parsed.data.clientId}`)
    return { ok: true, projectId }
  } catch (error) {
    const msg = (error as Error).message ?? ''
    if (msg.includes('projects_tenant_code_uq')) {
      return { ok: false, error: 'A project with that code already exists' }
    }
    console.error('convertTenderToProjectAction', error)
    return { ok: false, error: 'Could not convert tender' }
  }
}

export async function deleteTenderAction(id: string): Promise<void> {
  z.string().uuid().parse(id)
  const { tenantId } = await requireWritable()
  await db.delete(tenders).where(and(eq(tenders.id, id), eq(tenders.tenantId, tenantId)))
  revalidatePath('/tenders')
}

// ── Read helpers ─────────────────────────────────────────────────────────────

export type TenderRow = typeof tenders.$inferSelect & {
  clientName: string | null
}

export async function listTendersForTenant(opts: {
  q?: string
  clientId?: string
} = {}): Promise<TenderRow[]> {
  const { tenantId } = await getCurrentTenant()
  const rows = await db
    .select({ tender: tenders, clientName: clients.name })
    .from(tenders)
    .leftJoin(clients, eq(tenders.clientId, clients.id))
    .where(
      and(
        eq(tenders.tenantId, tenantId),
        ...(opts.q ? [ilike(tenders.name, `%${opts.q.trim()}%`)] : []),
        ...(opts.clientId ? [eq(tenders.clientId, opts.clientId)] : []),
      ),
    )
    .orderBy(tenders.updatedAt)
    .limit(500)

  return rows.map((r) => ({ ...r.tender, clientName: r.clientName ?? null }))
}

export async function getTenderById(id: string): Promise<TenderRow | null> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return null
  const { tenantId } = await getCurrentTenant()
  const rows = await db
    .select({ tender: tenders, clientName: clients.name })
    .from(tenders)
    .leftJoin(clients, eq(tenders.clientId, clients.id))
    .where(and(eq(tenders.id, parsed.data), eq(tenders.tenantId, tenantId)))
    .limit(1)
  const first = rows[0]
  if (!first) return null
  return { ...first.tender, clientName: first.clientName ?? null }
}

export type TenderPipelineTotals = {
  livePipeline: number
  wonYtd: number
  liveCount: number
  wonYtdCount: number
}

/**
 * Live pipeline = sum of bidValue ?? estimatedValue for non-terminal tenders.
 * Won YTD     = same sum for WON tenders updated in the current calendar year.
 */
export async function getTenderPipelineTotals(): Promise<TenderPipelineTotals> {
  const { tenantId } = await getCurrentTenant()
  const yearStart = new Date(new Date().getFullYear(), 0, 1)

  const liveAmount = sql<string>`coalesce(sum(coalesce(${tenders.bidValue}, ${tenders.estimatedValue}, 0)), 0)`
  const liveCount = sql<number>`count(*)::int`
  const [live] = await db
    .select({ amount: liveAmount, count: liveCount })
    .from(tenders)
    .where(
      and(
        eq(tenders.tenantId, tenantId),
        ne(tenders.status, 'WON'),
        ne(tenders.status, 'LOST'),
      ),
    )

  const wonAmount = sql<string>`coalesce(sum(coalesce(${tenders.bidValue}, ${tenders.estimatedValue}, 0)), 0)`
  const wonCount = sql<number>`count(*)::int`
  const [won] = await db
    .select({ amount: wonAmount, count: wonCount })
    .from(tenders)
    .where(
      and(
        eq(tenders.tenantId, tenantId),
        eq(tenders.status, 'WON'),
        sql`${tenders.updatedAt} >= ${yearStart.toISOString()}`,
      ),
    )

  return {
    livePipeline: Number(live?.amount ?? 0) || 0,
    liveCount: Number(live?.count ?? 0) || 0,
    wonYtd: Number(won?.amount ?? 0) || 0,
    wonYtdCount: Number(won?.count ?? 0) || 0,
  }
}

/** Used by the "Outstanding tenders without a converted project" hint. */
export async function countWonUnconverted(): Promise<number> {
  const { tenantId } = await getCurrentTenant()
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenders)
    .where(
      and(
        eq(tenders.tenantId, tenantId),
        eq(tenders.status, 'WON'),
        isNull(tenders.convertedProjectId),
      ),
    )
  return Number(row?.count ?? 0) || 0
}
