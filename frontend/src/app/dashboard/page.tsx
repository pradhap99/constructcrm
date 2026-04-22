'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { analytics, projects as projectsApi } from '@/lib/api'
import { formatCurrencyCr } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  IndianRupee, ShoppingCart, FileText, Building2,
  Target, TrendingUp, AlertCircle, Plus, ArrowRight,
  Loader2,
} from 'lucide-react'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className ?? ''}`} />
}

const STATUS_COLOR: Record<string, string> = {
  active:    'bg-green-100 text-green-700 border-green-200',
  planning:  'bg-blue-100 text-blue-700 border-blue-200',
  on_hold:   'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

export default function DashboardPage() {
  const router = useRouter()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics-stats'],
    queryFn: () => analytics.dashboardStats().then(r => r.data),
  })
  const { data: spendVendor = [], isLoading: vendorLoading } = useQuery({
    queryKey: ['spend-vendor'],
    queryFn: () => analytics.spendByVendor().then(r => r.data),
  })
  const { data: budgetActual = [], isLoading: chartLoading } = useQuery({
    queryKey: ['budget-actual'],
    queryFn: () => analytics.budgetVsActual().then(r => r.data),
  })
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  })

  const projectList: any[] = (projectsData as any)?.items ?? (Array.isArray(projectsData) ? projectsData : [])

  const kpis = [
    {
      label: 'Total Budget',
      value: statsLoading ? null : formatCurrencyCr(stats?.totalBudget ?? 0),
      icon: IndianRupee, color: 'text-indigo-600', bg: 'bg-indigo-50',
    },
    {
      label: 'Active Projects',
      value: statsLoading ? null : String(stats?.activeProjects ?? 0),
      icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50',
    },
    {
      label: 'Active POs',
      value: statsLoading ? null : String(stats?.activePOs ?? 0),
      icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      label: 'Pending Invoices',
      value: statsLoading ? null : String(stats?.pendingInvoices ?? 0),
      icon: FileText,
      color: (stats?.pendingInvoices ?? 0) > 0 ? 'text-red-600' : 'text-slate-500',
      bg: (stats?.pendingInvoices ?? 0) > 0 ? 'bg-red-50' : 'bg-slate-50',
    },
    {
      label: 'Monthly Spend',
      value: statsLoading ? null : formatCurrencyCr(stats?.monthlySpend ?? 0),
      icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50',
    },
    {
      label: 'Open Leads',
      value: statsLoading ? null : String(stats?.openLeads ?? 0),
      icon: Target, color: 'text-yellow-600', bg: 'bg-yellow-50',
    },
  ]

  const quickActions = [
    { label: 'New Project', icon: Building2, href: '/projects', color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Create Indent', icon: FileText, href: '/indents', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Add Vendor', icon: Target, href: '/vendors', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Record GRN', icon: ShoppingCart, href: '/grn', color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {kpi.value === null
                  ? <Skeleton className="h-6 w-16 mb-1" />
                  : <p className="text-xl font-bold leading-tight">{kpi.value}</p>
                }
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                onClick={() => router.push(a.href)}
                className="flex items-center gap-3 p-3.5 bg-white border border-border rounded-xl hover:shadow-md hover:border-indigo-200 transition-all text-left group"
              >
                <div className={`p-2 rounded-lg ${a.bg} shrink-0`}>
                  <Icon className={`w-4 h-4 ${a.color}`} />
                </div>
                <span className="text-sm font-medium">{a.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Budget vs Actual Spend (₹)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : budgetActual.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center gap-2">
                <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No spend data yet.</p>
                <p className="text-xs text-muted-foreground">Create invoices to see spend trends.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={budgetActual} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`₹${(v / 100000).toFixed(1)}L`, '']} />
                  <Bar dataKey="actual" fill="#6366f1" radius={[4, 4, 0, 0]} name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Vendors by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : spendVendor.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center gap-2">
                <AlertCircle className="w-7 h-7 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No vendor spend yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(spendVendor as any[]).slice(0, 5).map((v: any) => (
                  <div key={v.vendor_name ?? v.vendorName}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{v.vendor_name ?? v.vendorName}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{formatCurrencyCr(v.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${v.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Active Projects</CardTitle>
          <button
            onClick={() => router.push('/projects')}
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : projectList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Building2 className="w-10 h-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No projects yet.</p>
              <button
                onClick={() => router.push('/projects')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> Create your first project
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {projectList.slice(0, 5).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 py-3 hover:bg-muted/40 px-2 -mx-2 rounded-lg cursor-pointer transition-colors"
                  onClick={() => router.push(`/projects`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.client_name} · {p.city}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{formatCurrencyCr(p.budget_amount ?? 0)}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[p.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {p.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
