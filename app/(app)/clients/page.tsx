import { Users } from 'lucide-react'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bills, projects } from '@/lib/db/schema'
import { getCurrentTenant } from '@/lib/tenant'
import { listClientsForTenant } from '@/actions/clients'
import { ClientCard, type ClientWithAggregates } from '@/components/clients/client-card'
import { ClientsSearch } from '@/components/clients/clients-search'
import { ClientsTypeFilter } from '@/components/clients/clients-type-filter'
import { CreateClientButton } from '@/components/clients/create-client-modal'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }> | { q?: string; type?: string }
}) {
  const sp = await Promise.resolve(searchParams)
  const rows = await listClientsForTenant({ q: sp.q, type: sp.type })
  const aggregates = await aggregateByClient(rows.map((r) => r.id))

  const enriched: ClientWithAggregates[] = rows.map((r) => ({
    ...r,
    activeProjects: aggregates.get(r.id)?.activeProjects ?? 0,
    totalOutstanding: aggregates.get(r.id)?.totalOutstanding ?? 0,
  }))

  return (
    <div className="p-6 md:p-10">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Government bodies, private developers, PSUs, and PPP partners you work with.
          </p>
        </div>
        <CreateClientButton />
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClientsSearch />
        <ClientsTypeFilter />
      </div>

      {enriched.length === 0 ? <EmptyState filtered={Boolean(sp.q || sp.type)} /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {enriched.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Users className="h-10 w-10 text-muted-foreground/40" />
      {filtered ? (
        <>
          <h2 className="text-base font-medium">No matches</h2>
          <p className="text-sm text-muted-foreground">
            Try clearing the search or switching the filter back to All.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-base font-medium">Add your first client</h2>
          <p className="text-sm text-muted-foreground">
            Every project, tender, and bill in CivilIQ belongs to a client. Start by adding one.
          </p>
          <div className="pt-1">
            <CreateClientButton />
          </div>
        </>
      )}
    </div>
  )
}

type Aggregate = { activeProjects: number; totalOutstanding: number }

/**
 * Returns activeProjects + totalOutstanding for each clientId. Uses two
 * tenant-scoped GROUP BY queries; empty input short-circuits.
 *
 * "Active projects" = projects with status AWARDED or IN_PROGRESS.
 * "Outstanding"     = SUM(bills.netAmount - coalesce(bills.paidAmount, 0))
 *                     for bills with status SUBMITTED or CERTIFIED.
 * Phase 3 + Phase 5 will populate these tables with real data; today they
 * return zero per client, which is honest and shippable.
 */
async function aggregateByClient(clientIds: string[]): Promise<Map<string, Aggregate>> {
  const map = new Map<string, Aggregate>()
  if (clientIds.length === 0) return map

  const { tenantId } = await getCurrentTenant()

  const projectRows = await db
    .select({
      clientId: projects.clientId,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(projects)
    .where(
      and(
        eq(projects.tenantId, tenantId),
        inArray(projects.clientId, clientIds),
        inArray(projects.status, ['AWARDED', 'IN_PROGRESS']),
      ),
    )
    .groupBy(projects.clientId)

  for (const r of projectRows) {
    map.set(r.clientId, {
      activeProjects: Number(r.count) || 0,
      totalOutstanding: 0,
    })
  }

  const outstandingRows = await db
    .select({
      clientId: projects.clientId,
      total: sql<string>`coalesce(sum(${bills.netAmount} - coalesce(${bills.paidAmount}, 0)), 0)`.as(
        'total',
      ),
    })
    .from(bills)
    .innerJoin(projects, eq(bills.projectId, projects.id))
    .where(
      and(
        eq(bills.tenantId, tenantId),
        inArray(projects.clientId, clientIds),
        inArray(bills.status, ['SUBMITTED', 'CERTIFIED']),
      ),
    )
    .groupBy(projects.clientId)

  for (const r of outstandingRows) {
    const existing = map.get(r.clientId) ?? { activeProjects: 0, totalOutstanding: 0 }
    map.set(r.clientId, {
      activeProjects: existing.activeProjects,
      totalOutstanding: Number(r.total) || 0,
    })
  }

  return map
}
