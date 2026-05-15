'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Receipt,
  Target,
  Building2,
} from 'lucide-react'
import { billing as billingApi, leads as leadsApi, projects as projectsApi } from '@/lib/api'
import { isBillOverdue, billAgingDays } from '@/lib/bill-math'
import { cn, formatCurrencyCr, formatDate } from '@/lib/utils'

/**
 * Command center per CIVILIQ_BUILD_PLAN.md §7.1 — three sections sorted by
 * urgency, plus a hero "₹X outstanding across N bills" stat at the top.
 *
 * Definitions (matching the rebuild branch's app/(app)/today/page.tsx):
 *   - Bills overdue   = SUBMITTED with age > 15 days OR CERTIFIED with age > 30 days.
 *                       Aging clock uses `billing_period_start` as the
 *                       submitted-date proxy (same convention as bills.py).
 *   - Tenders closing = leads with follow_up_date ≤ today + 7 days AND
 *                       status not in (won, lost). Maps to the existing
 *                       Leads pipeline; see PR description.
 *   - Projects expir. = projects with end_date ≤ today + 30 days AND
 *                       status not 'completed'.
 */
export default function TodayPage() {
  const { data: billsResp, isLoading: billsLoading } = useQuery({
    queryKey: ['today', 'bills'],
    queryFn: () => billingApi.list({ limit: 500 }),
  })
  const { data: leadsResp, isLoading: leadsLoading } = useQuery({
    queryKey: ['today', 'leads'],
    queryFn: () => leadsApi.list({ limit: 500 }),
  })
  const { data: projectsResp, isLoading: projectsLoading } = useQuery({
    queryKey: ['today', 'projects'],
    queryFn: () => projectsApi.list({ limit: 500 }),
  })

  const bills: any[] = useMemo(() => {
    const raw = billsResp?.data as any
    return Array.isArray(raw) ? raw : (raw?.items ?? [])
  }, [billsResp])
  const leads: any[] = useMemo(() => {
    const raw = leadsResp?.data as any
    return Array.isArray(raw) ? raw : (raw?.items ?? [])
  }, [leadsResp])
  const projects: any[] = useMemo(() => {
    const raw = projectsResp?.data as any
    return Array.isArray(raw) ? raw : (raw?.items ?? [])
  }, [projectsResp])

  const overdueBills = useMemo(
    () =>
      bills
        .filter((b) =>
          isBillOverdue({
            status: b.status,
            submittedDate: b.submitted_date ?? b.billing_period_start,
            certifiedDate: null,
          }),
        )
        .sort((a, b) => {
          const aAge = billAgingDays({
            status: a.status,
            submittedDate: a.submitted_date ?? a.billing_period_start,
            certifiedDate: null,
          })
          const bAge = billAgingDays({
            status: b.status,
            submittedDate: b.submitted_date ?? b.billing_period_start,
            certifiedDate: null,
          })
          return bAge - aAge
        }),
    [bills],
  )

  const inSevenDays = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d
  }, [])
  const inThirtyDays = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d
  }, [])

  const closingTenders = useMemo(() => {
    return leads
      .filter((l) => {
        if (!l.follow_up_date) return false
        if (l.status === 'won' || l.status === 'lost') return false
        const due = new Date(l.follow_up_date)
        if (Number.isNaN(due.getTime())) return false
        return due.getTime() <= inSevenDays.getTime()
      })
      .sort(
        (a, b) =>
          new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime(),
      )
  }, [leads, inSevenDays])

  const expiringProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (!p.end_date) return false
        if (p.status === 'completed' || p.status === 'cancelled') return false
        const end = new Date(p.end_date)
        if (Number.isNaN(end.getTime())) return false
        return end.getTime() <= inThirtyDays.getTime()
      })
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
  }, [projects, inThirtyDays])

  const totalOutstanding = useMemo(
    () =>
      overdueBills.reduce((sum, b) => {
        const net = Number(b.net_amount ?? 0)
        const paid = Number(b.paid_amount ?? 0)
        return sum + Math.max(net - paid, 0)
      }, 0),
    [overdueBills],
  )

  const loading = billsLoading || leadsLoading || projectsLoading
  const allClear =
    !loading &&
    overdueBills.length === 0 &&
    closingTenders.length === 0 &&
    expiringProjects.length === 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today</h1>
        <p className="text-sm text-gray-500">
          What needs attention. Refresh the page to update.
        </p>
      </header>

      {/* Hero stat */}
      {loading ? (
        <HeroSkeleton />
      ) : (
        <Link
          href="/billing?status=overdue"
          className={cn(
            'block rounded-xl border p-6 transition-colors',
            overdueBills.length > 0
              ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100 hover:border-rose-300 dark:from-rose-950/30 dark:to-rose-900/20 dark:border-rose-900'
              : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:border-emerald-300 dark:from-emerald-950/30 dark:to-emerald-900/20 dark:border-emerald-900',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Outstanding
          </p>
          <p className="mt-1 text-3xl font-bold sm:text-4xl">
            {formatCurrencyCr(totalOutstanding)}
            <span className="ml-3 text-sm font-medium text-gray-500">
              across {overdueBills.length} overdue bill{overdueBills.length === 1 ? '' : 's'}
            </span>
          </p>
        </Link>
      )}

      {allClear ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-12 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h2 className="text-lg font-semibold">All clear — good day to plan ahead.</h2>
          <p className="max-w-sm text-sm text-gray-500">
            No overdue bills, no tenders closing this week, no projects expiring this month.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section
            title="Bills overdue"
            icon={Receipt}
            count={overdueBills.length}
            loading={billsLoading}
            emptyMessage="✓ All clear — no overdue bills"
            href="/billing"
          >
            {overdueBills.slice(0, 5).map((b) => {
              const age = billAgingDays({
                status: b.status,
                submittedDate: b.submitted_date ?? b.billing_period_start,
                certifiedDate: null,
              })
              const net = Number(b.net_amount ?? 0)
              return (
                <Row
                  key={b.id}
                  left={
                    <>
                      <span className="font-mono text-xs font-semibold text-indigo-600">
                        {b.billing_number}
                      </span>
                      <span className="text-gray-500"> · </span>
                      <span className="truncate">{b.project_name ?? '—'}</span>
                    </>
                  }
                  right={
                    <>
                      <span className="font-semibold">{formatCurrencyCr(net)}</span>
                      <Badge variant="danger">{age}d overdue</Badge>
                    </>
                  }
                />
              )
            })}
            {overdueBills.length > 5 && (
              <p className="px-2 pt-1 text-xs text-gray-500">
                + {overdueBills.length - 5} more on the Bills page
              </p>
            )}
          </Section>

          <Section
            title="Tenders closing in 7 days"
            icon={Target}
            count={closingTenders.length}
            loading={leadsLoading}
            emptyMessage="✓ All clear — no tenders closing this week"
            href="/leads"
          >
            {closingTenders.slice(0, 5).map((l) => {
              const due = new Date(l.follow_up_date)
              const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
              return (
                <Row
                  key={l.id}
                  left={
                    <>
                      <span className="font-medium">{l.name}</span>
                      {l.company && (
                        <>
                          <span className="text-gray-500"> · </span>
                          <span className="text-gray-500">{l.company}</span>
                        </>
                      )}
                    </>
                  }
                  right={
                    <>
                      {l.estimated_value && (
                        <span className="font-semibold">
                          {formatCurrencyCr(Number(l.estimated_value))}
                        </span>
                      )}
                      <Badge variant={days <= 0 ? 'danger' : days <= 3 ? 'warning' : 'info'}>
                        {days <= 0 ? 'today' : `${days}d left`}
                      </Badge>
                    </>
                  }
                />
              )
            })}
          </Section>

          <Section
            title="Projects expiring in 30 days"
            icon={Building2}
            count={expiringProjects.length}
            loading={projectsLoading}
            emptyMessage="✓ All clear — no projects expiring soon"
            href="/projects"
          >
            {expiringProjects.slice(0, 5).map((p) => {
              const end = new Date(p.end_date)
              const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000)
              return (
                <Row
                  key={p.id}
                  left={
                    <>
                      <span className="font-medium">{p.name}</span>
                      {p.client_name && (
                        <>
                          <span className="text-gray-500"> · </span>
                          <span className="text-gray-500">{p.client_name}</span>
                        </>
                      )}
                    </>
                  }
                  right={
                    <>
                      <span className="text-xs text-gray-500">{formatDate(p.end_date)}</span>
                      <Badge variant={days <= 7 ? 'danger' : days <= 14 ? 'warning' : 'info'}>
                        {days <= 0 ? `${Math.abs(days)}d past` : `${days}d left`}
                      </Badge>
                    </>
                  }
                />
              )
            })}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  count,
  loading,
  emptyMessage,
  href,
  children,
}: {
  title: string
  icon: React.ElementType
  count: number
  loading: boolean
  emptyMessage: string
  href: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border bg-white shadow-sm dark:bg-gray-800">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold">{title}</h2>
          {count > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {count}
            </span>
          )}
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-gray-100 dark:bg-gray-700" />
            ))}
          </div>
        ) : count === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-1.5">{children}</div>
        )}
      </div>
    </section>
  )
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
      <div className="min-w-0 truncate">{left}</div>
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </div>
  )
}

function Badge({
  variant,
  children,
}: {
  variant: 'danger' | 'warning' | 'info'
  children: React.ReactNode
}) {
  const styles = {
    danger:
      'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    warning:
      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    info: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        styles,
      )}
    >
      {children}
    </span>
  )
}

function HeroSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
  )
}