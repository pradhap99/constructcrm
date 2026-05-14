import { Building2 } from 'lucide-react'
import { listProjectsForTenant, listClientsForPicker } from '@/actions/projects'
import { ProjectCard } from '@/components/projects/project-card'
import { ProjectsSearch } from '@/components/projects/projects-search'
import { ProjectsStatusFilter } from '@/components/projects/projects-status-filter'
import { CreateProjectButton } from '@/components/projects/create-project-modal'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }> | { q?: string; status?: string }
}) {
  const sp = await Promise.resolve(searchParams)
  const [rows, clients] = await Promise.all([
    listProjectsForTenant({ q: sp.q, status: sp.status }),
    listClientsForPicker(),
  ])

  return (
    <div className="p-6 md:p-10">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Every project belongs to a client. Bills and variations live under projects.
          </p>
        </div>
        <CreateProjectButton clients={clients} />
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProjectsSearch />
        <ProjectsStatusFilter />
      </div>

      {rows.length === 0 ? (
        <EmptyState filtered={Boolean(sp.q || sp.status)} hasClients={clients.length > 0} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

async function EmptyState({
  filtered,
  hasClients,
}: {
  filtered: boolean
  hasClients: boolean
}) {
  const clients = hasClients ? await listClientsForPicker() : []
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
      <Building2 className="h-10 w-10 text-muted-foreground/40" />
      {filtered ? (
        <>
          <h2 className="text-base font-medium">No matches</h2>
          <p className="text-sm text-muted-foreground">
            Try clearing the search or switching the filter back to All.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-base font-medium">Add your first project</h2>
          <p className="text-sm text-muted-foreground">
            {hasClients
              ? 'Pick the client, fill in the contract value, set the timeline.'
              : 'A project always belongs to a client. Add a client first.'}
          </p>
          <div className="pt-1">
            <CreateProjectButton clients={clients} />
          </div>
        </>
      )}
    </div>
  )
}
