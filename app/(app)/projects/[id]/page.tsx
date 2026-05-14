import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Receipt, GitBranch, NotebookPen } from 'lucide-react'
import { getProjectById } from '@/actions/projects'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TimelineBar } from '@/components/projects/timeline-bar'
import { ProjectStatusChanger } from '@/components/projects/project-status-changer'
import { VariationsEditor } from '@/components/projects/variations-editor'
import { ProjectNotesEditor } from '@/components/projects/project-notes-editor'
import { formatINR } from '@/lib/currency'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const { id } = await Promise.resolve(params)
  const project = await getProjectById(id)
  if (!project) notFound()

  return (
    <div className="p-6 md:p-10">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        All projects
      </Link>

      <header className="mb-6 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {project.code}
            </p>
            <h1 className="truncate text-2xl font-semibold">{project.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <Link
                href={`/clients/${project.clientId}`}
                className="hover:text-foreground hover:underline"
              >
                {project.clientName}
              </Link>
            </p>
          </div>
          <ProjectStatusChanger projectId={project.id} initial={project.status} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Contract value" value={formatINR(Number(project.contractValue))} />
          <Metric label="Variations" value={`${project.variations?.length ?? 0}`} />
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Timeline
            </p>
            <div className="pt-1.5">
              <TimelineBar
                startDate={project.startDate}
                endDate={project.endDate}
                status={project.status}
              />
            </div>
          </div>
        </div>

        {project.description && (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        )}
        {project.siteAddress && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Site:</span> {project.siteAddress}
          </p>
        )}
      </header>

      <Tabs defaultValue="bills" className="w-full">
        <TabsList>
          <TabsTrigger value="bills" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Bills
          </TabsTrigger>
          <TabsTrigger value="variations" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Variations
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <NotebookPen className="h-3.5 w-3.5" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/40" />
            <h3 className="text-sm font-medium">Bills land in Phase 5</h3>
            <p className="max-w-sm text-xs text-muted-foreground">
              The RA-bill module (live tax math, status workflow, WhatsApp share) ships with
              Phase 5. Once it lands this tab shows every bill on this project.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="variations">
          <VariationsEditor projectId={project.id} initial={project.variations ?? []} />
        </TabsContent>

        <TabsContent value="notes">
          <ProjectNotesEditor projectId={project.id} initialNotes={project.notes} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}
