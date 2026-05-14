'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { clients } from '@/lib/db/schema'
import { getCurrentTenant, requireWritable } from '@/lib/tenant'
import {
  ClientContactSchema,
  ClientCreateSchema,
  type ClientContact,
} from '@/lib/zod-schemas'
import { z } from 'zod'

type CreateState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null

/** Server Action target for the create-client modal. */
export async function createClientAction(
  _: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const { tenantId } = await requireWritable()

  const parsed = ClientCreateSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    gstNumber: formData.get('gstNumber'),
    panNumber: formData.get('panNumber'),
    address: formData.get('address'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const [row] = await db
    .insert(clients)
    .values({
      tenantId,
      name: parsed.data.name,
      type: parsed.data.type,
      gstNumber: parsed.data.gstNumber,
      panNumber: parsed.data.panNumber,
      address: parsed.data.address,
      notes: parsed.data.notes,
    })
    .returning({ id: clients.id })

  if (!row) return { ok: false, error: 'Could not create client' }

  revalidatePath('/clients')
  return { ok: true, id: row.id }
}

/**
 * Inline-edit save for the notes textarea. Called from the detail page's
 * notes editor on blur. Silently succeeds — UI shows a "Saved" affordance.
 */
const NotesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(2000).nullable(),
})

export async function updateClientNotesAction(input: z.infer<typeof NotesSchema>): Promise<void> {
  const parsed = NotesSchema.parse(input)
  const { tenantId } = await requireWritable()

  await db
    .update(clients)
    .set({ notes: parsed.notes ?? null, updatedAt: new Date() })
    .where(and(eq(clients.id, parsed.id), eq(clients.tenantId, tenantId)))

  revalidatePath(`/clients/${parsed.id}`)
  revalidatePath('/clients')
}

/** Replace the entire contacts array on a client. */
const ContactsSchema = z.object({
  id: z.string().uuid(),
  contacts: z.array(ClientContactSchema).max(20),
})

export async function updateClientContactsAction(
  input: z.infer<typeof ContactsSchema>,
): Promise<{ ok: true; contacts: ClientContact[] } | { ok: false; error: string }> {
  const parsed = ContactsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid contact' }
  }
  const { tenantId } = await requireWritable()

  // Strip optional empty-string emails before persisting.
  const cleaned: ClientContact[] = parsed.data.contacts.map((c) => ({
    name: c.name,
    role: c.role || undefined,
    phone: c.phone || undefined,
    email: c.email || undefined,
  }))

  await db
    .update(clients)
    .set({ contacts: cleaned, updatedAt: new Date() })
    .where(and(eq(clients.id, parsed.data.id), eq(clients.tenantId, tenantId)))

  revalidatePath(`/clients/${parsed.data.id}`)
  return { ok: true, contacts: cleaned }
}

/** Soft delete is not modelled in the schema — this is a hard delete. */
export async function deleteClientAction(id: string): Promise<void> {
  z.string().uuid().parse(id)
  const { tenantId } = await requireWritable()

  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))

  revalidatePath('/clients')
}

/**
 * Read-side helper used by Server Components on the list page. Kept here so
 * the SQL stays close to its writes; not strictly a Server Action.
 */
export async function listClientsForTenant(opts: {
  q?: string
  type?: string | null
}): Promise<Array<typeof clients.$inferSelect>> {
  const { tenantId } = await getCurrentTenant()
  const q = opts.q?.trim()
  const type = opts.type && opts.type !== 'All' ? opts.type : null

  return db.query.clients.findMany({
    where: (t, { and: a, eq: e, ilike }) => {
      const conditions = [e(t.tenantId, tenantId)]
      if (q) conditions.push(ilike(t.name, `%${q}%`))
      if (type) {
        conditions.push(
          e(t.type, type as 'Government' | 'Private' | 'PSU' | 'PPP'),
        )
      }
      return a(...conditions)
    },
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
    limit: 200,
  })
}

/** Tenant-scoped single-client fetch for the detail page. Returns null on miss. */
export async function getClientById(id: string): Promise<typeof clients.$inferSelect | null> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return null
  const { tenantId } = await getCurrentTenant()
  const row = await db.query.clients.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.id, parsed.data), e(t.tenantId, tenantId)),
  })
  return row ?? null
}
