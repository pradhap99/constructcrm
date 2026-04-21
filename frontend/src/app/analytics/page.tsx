'use client'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IndianRupee, TrendingUp, Package, Layers, BarChart3, Loader2 } from 'lucide-react'
import { cn, formatCurrencyCr } from '@/lib/utils'
import { apiClient } from '@/lib/api'

// ── API fetchers ─────────────────────────────────────────────────────────────

type DashboardStats = {
  total_spend?: number
  totalBudget?: number
  activeProjects?: number
  active_projects?: number
  activePOs?: number
  active_pos?: number
  pendingInvoices?: number
  pending_invoices?: number
  monthlySpend?: number
  monthly_spend?: number
  [key: string]: unknown
}

type CategoryRow  = { category: string; amount: number; percentage: number }
type VendorRow    = { vendorName?: string; vendor_name?: string; amount: number; percentage: number }
type BudgetRow    = { month: string; budget: number; actual: number }

const fetchDashboardStats  = () => apiClient.get<DashboardStats>('/analytics/dashboard-stats').then(r => r.data)
const fetchSpendByCategory = () => apiClient.get<CategoryRow[]>('/analytics/spend-by-category').then(r => r.data)
const fetchSpendByVendor   = () => apiClient.get<VendorRow[]>('/analytics/spend-by-vendor').then(r => r.data)
const fetchBudgetVsActual  = () => apiClient.get<BudgetRow[]>('/analytics/budget-vs-actual').then(r => r.data)

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 dark:bg-gray-700 rounded', className)} />
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <BarChart3 className="w-14 h-14 text-gray-300 dark:text-gray-600" />
      <div>
        <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">No analytics data yet.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Create projects and purchase orders to see insights here.
        </p>
      </div>
    </div>
  )
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KpiCards({ stats }: { stats: DashboardStats }) {
  const totalSpend     = (stats.total_spend     ?? stats.totalBudget       ?? 0) as number
  const activeProjects = (stats.active_projects ?? stats.activeProjects    ?? 0) as number
  const activePOs      = (stats.active_pos      ?? stats.activePOs         ?? 0) as number
  const monthlySpend   = (stats.monthly_spend   ?? stats.monthlySpend      ?? 0) as number

  const cards = [
    {
      label: 'Total Spend',
      value: formatCurrencyCr(totalSpend),
      icon: IndianRupee,
      color: 'text-indigo-600',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Monthly Spend',
      value: formatCurrencyCr(monthlySpend),
      icon: TrendingUp,
      color: 'text-purple-600',
      iconBg: 'bg-purple-50 dark:bg-purple-950',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Active Projects',
      value: String(activeProjects),
      icon: Layers,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Active POs',
      value: String(activePOs),
      icon: Package,
      color: 'text-amber-600',
      iconBg: 'bg-amber-50 dark:bg-amber-950',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, iconBg, iconColor }) => (
        <div key={label} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-4">
          <div className={cn('p-3 rounded-xl', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={cn('text-xl font-bold', color)}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Category Table ────────────────────────────────────────────────────────────

function CategoryTable({ rows }: { rows: CategoryRow[] }) {
  if (!rows.length) return <EmptyState />
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {['#', 'Category', 'Amount', 'Share', 'Distribution'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row, i) => (
            <tr key={row.category} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-gray-400 text-xs">#{i + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{row.category}</td>
              <td className="px-4 py-3 font-semibold text-indigo-600">{formatCurrencyCr(row.amount)}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.percentage.toFixed(1)}%</td>
              <td className="px-4 py-3 w-40">
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, row.percentage)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Vendor Table ──────────────────────────────────────────────────────────────

function VendorTable({ rows }: { rows: VendorRow[] }) {
  if (!rows.length) return <EmptyState />
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {['#', 'Vendor', 'Amount', 'Share', 'Distribution'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row, i) => {
            const name = row.vendorName ?? row.vendor_name ?? '—'
            return (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-gray-400 text-xs">#{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{name}</td>
                <td className="px-4 py-3 font-semibold text-purple-600">{formatCurrencyCr(row.amount)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.percentage.toFixed(1)}%</td>
                <td className="px-4 py-3 w-40">
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, row.percentage)}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Budget vs Actual Table ────────────────────────────────────────────────────

function BudgetTable({ rows }: { rows: BudgetRow[] }) {
  if (!rows.length) return <EmptyState />
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {['Month', 'Budget', 'Actual', 'Variance', 'Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map(row => {
            const variance = row.actual - row.budget
            const over = variance > 0
            return (
              <tr key={row.month} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{row.month}</td>
                <td className="px-4 py-3 text-indigo-600 font-semibold">{formatCurrencyCr(row.budget)}</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">{formatCurrencyCr(row.actual)}</td>
                <td className={cn('px-4 py-3 font-semibold', over ? 'text-red-600' : 'text-green-600')}>
                  {over ? '+' : ''}{formatCurrencyCr(variance)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    over
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  )}>
                    {over ? 'Over Budget' : 'Under Budget'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  stats,
  categories,
  vendors,
  statsLoading,
  catLoading,
  vendorLoading,
  hasAnyData,
}: {
  stats: DashboardStats | undefined
  categories: CategoryRow[] | undefined
  vendors: VendorRow[] | undefined
  statsLoading: boolean
  catLoading: boolean
  vendorLoading: boolean
  hasAnyData: boolean
}) {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      {statsLoading ? (
        <KpiSkeleton />
      ) : stats ? (
        <KpiCards stats={stats} />
      ) : (
        <KpiSkeleton />
      )}

      {!hasAnyData && !statsLoading && !catLoading && !vendorLoading && (
        <EmptyState />
      )}

      {hasAnyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top categories */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Spend Categories</h3>
            {catLoading ? (
              <TableSkeleton rows={4} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(categories ?? []).slice(0, 5).map(row => (
                      <tr key={row.category} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{row.category}</td>
                        <td className="px-4 py-2.5 text-right text-indigo-600 font-semibold">{formatCurrencyCr(row.amount)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{row.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                    {!(categories ?? []).length && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-sm">No category data yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top vendors */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Vendors by Spend</h3>
            {vendorLoading ? (
              <TableSkeleton rows={4} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(vendors ?? []).slice(0, 5).map((row, i) => {
                      const name = row.vendorName ?? row.vendor_name ?? '—'
                      return (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{name}</td>
                          <td className="px-4 py-2.5 text-right text-purple-600 font-semibold">{formatCurrencyCr(row.amount)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{row.percentage.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                    {!(vendors ?? []).length && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-sm">No vendor data yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: fetchDashboardStats,
  })

  const {
    data: categories,
    isLoading: catLoading,
    isError: catError,
  } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: fetchSpendByCategory,
  })

  const {
    data: vendors,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useQuery({
    queryKey: ['analytics-vendors'],
    queryFn: fetchSpendByVendor,
  })

  const {
    data: budgetVsActual,
    isLoading: budgetLoading,
    isError: budgetError,
  } = useQuery({
    queryKey: ['analytics-budget'],
    queryFn: fetchBudgetVsActual,
  })

  const hasAnyData =
    (categories ?? []).length > 0 ||
    (vendors ?? []).length > 0 ||
    (budgetVsActual ?? []).length > 0

  const anyError = statsError || catError || vendorError || budgetError

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Procurement intelligence and project performance insights</p>
      </div>

      {anyError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Some analytics data could not be loaded. Please try refreshing.
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="vendor">By Vendor</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
        </TabsList>

        {/* ── Overview ─────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <OverviewTab
            stats={stats}
            categories={categories}
            vendors={vendors}
            statsLoading={statsLoading}
            catLoading={catLoading}
            vendorLoading={vendorLoading}
            hasAnyData={hasAnyData}
          />
        </TabsContent>

        {/* ── By Category ──────────────────────────────────────────────── */}
        <TabsContent value="category" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Spend by Category</h2>
            <p className="text-sm text-gray-500">Procurement spend breakdown across material categories</p>
          </div>
          {catLoading ? (
            <TableSkeleton rows={6} />
          ) : catError ? (
            <div className="py-8 text-center text-red-500 text-sm">Failed to load category data.</div>
          ) : (
            <CategoryTable rows={categories ?? []} />
          )}
        </TabsContent>

        {/* ── By Vendor ────────────────────────────────────────────────── */}
        <TabsContent value="vendor" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Spend by Vendor</h2>
            <p className="text-sm text-gray-500">Total procurement spend per vendor</p>
          </div>
          {vendorLoading ? (
            <TableSkeleton rows={6} />
          ) : vendorError ? (
            <div className="py-8 text-center text-red-500 text-sm">Failed to load vendor data.</div>
          ) : (
            <VendorTable rows={vendors ?? []} />
          )}
        </TabsContent>

        {/* ── Budget vs Actual ─────────────────────────────────────────── */}
        <TabsContent value="budget" className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Budget vs Actual</h2>
            <p className="text-sm text-gray-500">Monthly budget targets compared to actual spend</p>
          </div>
          {budgetLoading ? (
            <TableSkeleton rows={6} />
          ) : budgetError ? (
            <div className="py-8 text-center text-red-500 text-sm">Failed to load budget data.</div>
          ) : (
            <BudgetTable rows={budgetVsActual ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
