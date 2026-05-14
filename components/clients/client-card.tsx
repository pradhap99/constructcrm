import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { formatDate, daysAgo } from '@/lib/date'
import { formatINRShort } from '@/lib/currency'
import { ClientTypeBadge } from './client-type-badge'
import type { Client } from '@/lib/db/schema'

export type ClientWithAggregates = Client & {
  activeProjects: number
  totalOutstanding: number
}

export function ClientCard({ client }: { client: ClientWithAggregates }) {
  const age = daysAgo(client.updatedAt)
  const ageLabel = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`

  return (
    <Link
      href={`/clients/${client.id}`}
      className="group relative flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold leading-tight">{client.name}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Updated {ageLabel} · {formatDate(client.updatedAt)}
          </p>
        </div>
        <ClientTypeBadge type={client.type} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric
          label="Active projects"
          value={client.activeProjects.toLocaleString('en-IN')}
        />
        <Metric label="Outstanding" value={formatINRShort(client.totalOutstanding)} />
      </div>

      {client.activeProjects === 0 && client.totalOutstanding === 0 && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Building2 className="h-3 w-3" />
          No projects yet
        </p>
      )}
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}
