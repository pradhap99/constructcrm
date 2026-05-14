import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatINRShort } from '@/lib/currency'
import { ProjectStatusBadge } from './project-status-badge'
import { TimelineBar } from './timeline-bar'
import type { ProjectWithClient } from '@/actions/projects'

export function ProjectCard({ project }: { project: ProjectWithClient }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {project.code}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-semibold leading-tight">{project.name}</h2>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {project.clientName}
          </p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Contract value
        </p>
        <p className="mt-0.5 text-sm font-semibold">
          {formatINRShort(Number(project.contractValue))}
        </p>
      </div>

      <TimelineBar
        startDate={project.startDate}
        endDate={project.endDate}
        status={project.status}
      />

      <p className="mt-auto flex items-center justify-end gap-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3 w-3" />
      </p>
    </Link>
  )
}
