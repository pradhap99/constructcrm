import { Receipt } from 'lucide-react'
import {
  listBillsForTenant,
  listProjectsForBillPicker,
  getTenantBillDefaults,
  getBillStatusCounts,
} from '@/actions/bills'
import { BillRow } from '@/components/bills/bill-row'
import { BillsFilterPills } from '@/components/bills/bills-filter-pills'
import { CreateBillButton } from '@/components/bills/bill-form'
import { billAgingDays } from '@/lib/bill-math'

export const dynamic = 'force-dynamic'

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }> | { status?: string }
}) {
  const sp = await Promise.resolve(searchParams)
  const [bills, projects, defaults, counts] = await Promise.all([
    listBillsForTenant({ status: sp.status }),
    listProjectsForBillPicker(),
    getTenantBillDefaults(),
    getBillStatusCounts(),
  ])

  // Default sort: aging desc, then most-recently-updated desc.
  const sorted = bills.slice().sort((a, b) => {
    const aAge = billAgingDays({
      status: a.status,
      submittedDate: a.submittedDate,
      certifiedDate: a.certifiedDate,
    })
    const bAge = billAgingDays({
      status: b.status,
      submittedDate: b.submittedDate,
      certifiedDate: b.certifiedDate,
    })
    if (bAge !== aAge) return bAge - aAge
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <div className="p-6 md:p-10">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bills</h1>
          <p className="text-sm text-muted-foreground">
            Running-account bills with live tax math. Default sort is aging — oldest exposure
            first.
          </p>
        </div>
        <CreateBillButton projects={projects} defaults={defaults} />
      </header>

      <div className="mb-5">
        <BillsFilterPills counts={counts} />
      </div>

      {sorted.length === 0 ? (
        <EmptyState filtered={Boolean(sp.status)} hasProjects={projects.length > 0} />
      ) : (
        <div className="space-y-2">
          {sorted.map((b) => (
            <BillRow key={b.id} bill={b} />
          ))}
        </div>
      )}
    </div>
  )
}

async function EmptyState({
  filtered,
  hasProjects,
}: {
  filtered: boolean
  hasProjects: boolean
}) {
  const [defaults, projects] = await Promise.all([
    getTenantBillDefaults(),
    listProjectsForBillPicker(),
  ])
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Receipt className="h-10 w-10 text-muted-foreground/40" />
      {filtered ? (
        <>
          <h2 className="text-base font-medium">No bills match</h2>
          <p className="text-sm text-muted-foreground">Try a different filter chip.</p>
        </>
      ) : (
        <>
          <h2 className="text-base font-medium">Raise your first bill</h2>
          <p className="text-sm text-muted-foreground">
            {hasProjects
              ? 'Pick the project and key in the gross. The net updates live as you type.'
              : 'You need a project first. Add one — bills sit under projects.'}
          </p>
          <div className="pt-1">
            <CreateBillButton projects={projects} defaults={defaults} />
          </div>
        </>
      )}
    </div>
  )
}
