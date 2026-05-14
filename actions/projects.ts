'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, ilike } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { projects, clients } from '@/lib/db/schema'
import { getCurrentTenant, requireWritable } from '@/lib/tenant'
import {
  ProjectCreateSchema,
  ProjectStatusSchema,
  ProjectVariationSchema,
  type ProjectStatus,
  type ProjectVariation,
} from '@/lib/zod-schemas'

type CreateState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null

/** Server Action target for the create-project modal. */
export async function createProjectAction(
  _: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const { tenantId } = await requireWritable()

  const contractValueRaw = formData.get('contractValue')
  const parsed = ProjectCreateSchema.safeParse({
    clientId: formData.get('clientId'),
    name: formData.get('name'),
    code: formData.get('code'),
    contractValue:
      typeof contractValueRaw === 'string' && contractValueRaw.length > 0
        ? Number(contractValueRaw)
        : Number.NaN,
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    status: formData.get('status') || 'IN_PROGRESS',
    siteAddress: formData.get('siteAddress'),
    description: formData.get('description'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  // Make sure the clientId actually belongs to this tenant — the FK alone
  // doesn't enforce that.
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, parsed.data.clientId), eq(clients.tenantId, tenantId)),
    columns: { id: true },
  })
  if (!client) {
    return { ok: false, error: 'That client is not in your workspace' }
  }

  try {
    const [row] = await db
      .insert(projects)
      .values({
        tenantId,
        clientId: parsed.data.clientId,
        name: parsed.data.name,
        code: parsed.data.code,
        contractValue: parsed.data.contractValue.toFixed(2),
        status: parsed.data.status,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        siteAddress: parsed.data.siteAddress,
        description: parsed.data.description,
        notes: parsed.data.notes,
      })
      .returning({ id: projects.id })

    if (!row) return { ok: false, error: 'Could not create project' }

    revalidatePath('/projects')
    revalidatePath(`/clients/${parsed.data.clientId}`)
    return { ok: true, id: row.id }
  } catch (error) {
    // Most likely cause is unique-index collision on (tenantId, code).
    const msg = (error as Error).message ?? ''
    if (msg.includes('projects_tenant_code_uq')) {
      return { ok: false, error: 'A project with that code already exists' }
    }
    console.error('createProjectAction', error)
    return { ok: false, error: 'Could not create project' }
  }
}

const NotesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(2000).nullable(),
})

export async function updateProjectNotesAction(
  input: z.infer<typeof NotesSchema>,
): Promise<void> {
  const parsed = NotesSchema.parse(input)
  const { tenantId } = await requireWritable()
  await db
    .update(projects)
    .set({ notes: parsed.notes ?? null, updatedAt: new Date() })
    .where(and(eq(projects.id, parsed.id), eq(projects.tenantId, tenantId)))
  revalidatePath(`/projects/${parsed.id}`)
  revalidatePath('/projects')
}

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: ProjectStatusSchema,
})

export async function updateProjectStatusAction(
  input: z.infer<typeof StatusSchema>,
): Promise<{ ok: true; status: ProjectStatus } | { ok: false; error: string }> {
  const parsed = StatusSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid status' }
  }
  const { tenantId } = await requireWritable()
  await db
    .update(projects)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(projects.id, parsed.data.id), eq(projects.tenantId, tenantId)))
  revalidatePath(`/projects/${parsed.data.id}`)
  revalidatePath('/projects')
  return { ok: true, status: parsed.data.status }
}

const VariationsSchema = z.object({
  id: z.string().uuid(),
  variations: z.array(ProjectVariationSchema).max(50),
})

export async function updateProjectVariationsAction(
  input: z.infer<typeof VariationsSchema>,
): Promise<{ ok: true; variations: ProjectVariation[] } | { ok: false; error: string }> {
  const parsed = VariationsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid variation' }
  }
  const { tenantId } = await requireWritable()
  await db
    .update(projects)
    .set({ variations: parsed.data.variations, updatedAt: new Date() })
    .where(and(eq(projects.id, parsed.data.id), eq(projects.tenantId, tenantId)))
  revalidatePath(`/projects/${parsed.data.id}`)
  return { ok: true, variations: parsed.data.variations }
}

export async function deleteProjectAction(id: string): Promise<void> {
  z.string().uuid().parse(id)
  const { tenantId } = await requireWritable()
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
  revalidatePath('/projects')
}

// ── Read helpers used by Server Components ──────────────────────────────────

export type ProjectWithClient = typeof projects.$inferSelect & {
  clientName: string
  clientId: string
}

export async function listProjectsForTenant(opts: {
  q?: string
  status?: string | null
  clientId?: string
}): Promise<ProjectWithClient[]> {
  const { tenantId } = await getCurrentTenant()
  const q = opts.q?.trim()
  const status =
    opts.status && opts.status !== 'All'
      ? (opts.status as ProjectStatus)
      : null

  const rows = await db
    .select({
      project: projects,
      clientName: clients.name,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(projects.tenantId, tenantId),
        ...(q ? [ilike(projects.name, `%${q}%`)] : []),
        ...(status ? [eq(projects.status, status)] : []),
        ...(opts.clientId ? [eq(projects.clientId, opts.clientId)] : []),
      ),
    )
    .orderBy(projects.updatedAt)
    .limit(200)

  return rows.map((r) => ({ ...r.project, clientName: r.clientName, clientId: r.project.clientId }))
}

export async function getProjectById(id: string): Promise<ProjectWithClient | null> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return null
  const { tenantId } = await getCurrentTenant()
  const row = await db
    .select({ project: projects, clientName: clients.name })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, parsed.data), eq(projects.tenantId, tenantId)))
    .limit(1)
  const first = row[0]
  if (!first) return null
  return { ...first.project, clientName: first.clientName, clientId: first.project.clientId }
}

export async function listClientsForPicker(): Promise<Array<{ id: string; name: string }>> {
  const { tenantId } = await getCurrentTenant()
  return db.query.clients.findMany({
    where: eq(clients.tenantId, tenantId),
    columns: { id: true, name: true },
    orderBy: (t, { asc }) => [asc(t.name)],
    limit: 500,
  })
}
