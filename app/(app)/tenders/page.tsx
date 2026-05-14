import { Target } from 'lucide-react'
import { formatINRShort } from '@/lib/currency'
import {
  listTendersForTenant,
  getTenderPipelineTotals,
  countWonUnconverted,
} from '@/actions/tenders'
import { listClientsForPicker } from '@/actions/projects'
import { TenderBoard } from '@/components/tenders/tender-board'
import { CreateTenderButton } from '@/components/tenders/create-tender-modal'

export const dynamic = 'force-dynamic'

export default async function TendersPage() {
  const [tenders, clients, totals, unconverted] = await Promise.all([
    listTendersForTenant(),
    listClientsForPicker(),
    getTenderPipelineTotals(),
    countWonUnconverted(),
  ])

  return (
    <div className="p-6 md:p-10">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tenders</h1>
          <p className="text-sm text-muted-foreground">
            From EOI through award. Won tenders become projects.
          </p>
        </div>
        <CreateTenderButton clients={clients} />
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric
          label="Live pipeline"
          value={formatINRShort(totals.livePipeline)}
          hint={`${totals.liveCount} active`}
        />
        <Metric
          label="Won YTD"
          value={formatINRShort(totals.wonYtd)}
          hint={`${totals.wonYtdCount} closed this year`}
        />
        <Metric
          label="Awaiting conversion"
          value={String(unconverted)}
          hint="WON tenders not yet a project"
          warn={unconverted > 0}
        />
      </div>

      {tenders.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Target className="h-10 w-10 text-muted-foreground/40" />
          <h2 className="text-base font-medium">Track your first tender</h2>
          <p className="text-sm text-muted-foreground">
            Add a tender, walk it through EOI → Bidding → Submitted → Evaluation. WON tenders
            can be converted to projects right from the card.
          </p>
          <div className="pt-1">
            <CreateTenderButton clients={clients} />
          </div>
        </div>
      ) : (
        <TenderBoard tenders={tenders} clientsForPicker={clients} />
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  warn,
}: {
  label: string
  value: string
  hint?: string
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 ${
        warn ? 'border-amber-300 dark:border-amber-800' : ''
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
