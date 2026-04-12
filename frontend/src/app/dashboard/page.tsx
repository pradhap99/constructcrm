'use client'
import { useQuery } from '@tanstack/react-query'
import { analytics } from '@/lib/api'
import { formatCurrencyCr, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  IndianRupee, ShoppingCart, Package, Users, TrendingUp,
  FileText, Building2, Target, AlertCircle
} from 'lucide-react'
import type { DashboardStats } from '@/lib/types'

const MOCK_STATS: DashboardStats = {
  totalBudget: 125000000,
  activePOs: 24,
  pendingGRNs: 8,
  totalManpower: 145,
  monthlySpend: 18000000,
  pendingInvoices: 12,
  activeProjects: 5,
  openLeads: 9,
  spendByMonth: [
    { month: 'Aug', amount: 12000000 },
    { month: 'Sep', amount: 15000000 },
    { month: 'Oct', amount: 11000000 },
    { month: 'Nov', amount: 17000000 },
    { month: 'Dec', amount: 14000000 },
    { month: 'Jan', amount: 18000000 },
  ],
  topVendors: [
    { name: 'Tata Steel Ltd', spend: 8500000, rating: 4.5 },
    { name: 'ACC Cement', spend: 6200000, rating: 4.2 },
    { name: 'L&T Infra', spend: 5800000, rating: 4.7 },
    { name: 'Ultratech', spend: 4100000, rating: 4.0 },
  ],
  recentActivity: [
    { id: '1', type: 'PO', description: 'PO-2024-0089 raised for Tata Steel', timestamp: '2024-01-15T10:30:00Z', status: 'approved' },
    { id: '2', type: 'GRN', description: 'GRN-2024-0045 received for ACC Cement', timestamp: '2024-01-15T09:15:00Z', status: 'confirmed' },
    { id: '3', type: 'Indent', description: 'Indent IND-2024-0112 pending approval', timestamp: '2024-01-15T08:00:00Z', status: 'pending_approval' },
    { id: '4', type: 'Invoice', description: 'Invoice INV-2024-0078 approved', timestamp: '2024-01-14T16:45:00Z', status: 'approved' },
    { id: '5', type: 'RFQ', description: 'RFQ-2024-0056 quotes received', timestamp: '2024-01-14T14:30:00Z', status: 'quotes_received' },
  ],
}

const kpiCards = (stats: DashboardStats) => [
  { label: 'Total Budget', value: formatCurrencyCr(stats.totalBudget), icon: IndianRupee, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950' },
  { label: 'Active POs', value: stats.activePOs.toString(), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
  { label: 'Pending GRNs', value: stats.pendingGRNs.toString(), icon: Package, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
  { label: 'Manpower Today', value: stats.totalManpower.toString(), icon: Users, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
  { label: 'Monthly Spend', value: formatCurrencyCr(stats.monthlySpend), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
  { label: 'Pending Invoices', value: stats.pendingInvoices.toString(), icon: FileText, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  { label: 'Active Projects', value: stats.activeProjects.toString(), icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950' },
  { label: 'Open Leads', value: stats.openLeads.toString(), icon: Target, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
]

const statusColors: Record<string, string> = {
  approved: 'success', confirmed: 'success', pending_approval: 'warning',
  quotes_received: 'info', draft: 'secondary',
}

export default function DashboardPage() {
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analytics.dashboardStats().then(r => r.data),
  })
  const stats = statsData ?? MOCK_STATS

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards(stats).map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.bg}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Procurement Spend (₹)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.spendByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="Spend" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendor Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Vendors by Spend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topVendors.map((v) => (
              <div key={v.name} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrencyCr(v.spend)}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  ★ {v.rating}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Procurement Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.map((act) => (
              <div key={act.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{act.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(act.timestamp).toLocaleString('en-IN')}</p>
                </div>
                <Badge variant={statusColors[act.status] as 'success' | 'warning' | 'info' | 'secondary' ?? 'secondary'}>
                  {act.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
