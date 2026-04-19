'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  IndianRupee, TrendingUp, Package, Users, Clock,
  CheckCircle2, AlertTriangle, XCircle, Star
} from 'lucide-react'

// ── Spend Analysis Data ──────────────────────────────────────────────────────

const monthlySpendData = [
  { month: 'Apr', amount: 8.2 },
  { month: 'May', amount: 10.5 },
  { month: 'Jun', amount: 12.1 },
  { month: 'Jul', amount: 9.8 },
  { month: 'Aug', amount: 12.0 },
  { month: 'Sep', amount: 15.0 },
  { month: 'Oct', amount: 11.0 },
  { month: 'Nov', amount: 17.0 },
  { month: 'Dec', amount: 14.0 },
  { month: 'Jan', amount: 18.0 },
  { month: 'Feb', amount: 16.5 },
  { month: 'Mar', amount: 19.2 },
]

const spendByCategoryData = [
  { name: 'Steel', value: 34 },
  { name: 'Cement', value: 22 },
  { name: 'Labour', value: 18 },
  { name: 'Equipment', value: 12 },
  { name: 'Electrical', value: 8 },
  { name: 'Others', value: 6 },
]

const CATEGORY_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b']

const topItemsBySpend = [
  { item: 'TMT Bars', category: 'Steel', spend: '₹24.5 L' },
  { item: 'OPC Cement', category: 'Cement', spend: '₹18.2 L' },
  { item: 'RMC M30', category: 'Cement', spend: '₹15.8 L' },
  { item: 'HT Cables', category: 'Electrical', spend: '₹11.2 L' },
  { item: 'JCB Rental', category: 'Equipment', spend: '₹9.4 L' },
]

// ── Budget vs Actual Data ────────────────────────────────────────────────────

const budgetVsActualData = [
  { month: 'Oct', budget: 15, actual: 12 },
  { month: 'Nov', budget: 16, actual: 15 },
  { month: 'Dec', budget: 17, actual: 11 },
  { month: 'Jan', budget: 18, actual: 17 },
  { month: 'Feb', budget: 19, actual: 14 },
  { month: 'Mar', budget: 20, actual: 18 },
]

const projectBudgetData = [
  { name: 'Riverside Residential', budget: 4.5, spent: 3.2, utilization: 71 },
  { name: 'NH-48 Highway Pkg', budget: 8.2, spent: 6.9, utilization: 84 },
  { name: 'Tech Park Phase 2', budget: 6.0, spent: 2.8, utilization: 47 },
  { name: 'Metro Station Retrofit', budget: 3.1, spent: 2.9, utilization: 94 },
  { name: 'Solar Farm Foundation', budget: 2.4, spent: 0.8, utilization: 33 },
]

// ── Vendor Performance Data ──────────────────────────────────────────────────

const vendorChartData = [
  { vendor: 'Tata Steel', rating: 4.5, spend: 8.5 },
  { vendor: 'ACC Cement', rating: 4.2, spend: 6.2 },
  { vendor: 'L&T Infra', rating: 4.7, spend: 5.8 },
  { vendor: 'Ultratech', rating: 4.0, spend: 4.1 },
  { vendor: 'Raj Infra', rating: 3.8, spend: 3.2 },
]

const vendorTableData = [
  { name: 'Tata Steel Ltd', orders: 18, onTime: 94, rejection: 0.8, rating: 4.5, status: 'active' },
  { name: 'ACC Cement', orders: 14, onTime: 88, rejection: 1.2, rating: 4.2, status: 'active' },
  { name: 'L&T Infra', orders: 11, onTime: 97, rejection: 0.4, rating: 4.7, status: 'active' },
  { name: 'Ultratech', orders: 9, onTime: 83, rejection: 2.1, rating: 4.0, status: 'active' },
  { name: 'Raj Infra', orders: 7, onTime: 71, rejection: 4.5, rating: 3.8, status: 'review' },
  { name: 'Shree Cement', orders: 5, onTime: 80, rejection: 3.0, rating: 3.9, status: 'active' },
]

// ── Project Health Data ──────────────────────────────────────────────────────

const projectHealthData = [
  {
    name: 'Riverside Residential',
    planned: 65,
    actual: 58,
    daysRemaining: 42,
    score: 'amber',
    phase: 'Structure',
  },
  {
    name: 'NH-48 Highway Pkg',
    planned: 80,
    actual: 84,
    daysRemaining: 28,
    score: 'green',
    phase: 'Finishing',
  },
  {
    name: 'Tech Park Phase 2',
    planned: 45,
    actual: 38,
    daysRemaining: 95,
    score: 'amber',
    phase: 'Foundation',
  },
  {
    name: 'Metro Station Retrofit',
    planned: 90,
    actual: 75,
    daysRemaining: 12,
    score: 'red',
    phase: 'MEP',
  },
  {
    name: 'Solar Farm Foundation',
    planned: 30,
    actual: 32,
    daysRemaining: 110,
    score: 'green',
    phase: 'Earthwork',
  },
]

// ── Helper Components ────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function HealthIcon({ score }: { score: string }) {
  if (score === 'green') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
  if (score === 'amber') return <AlertTriangle className="w-5 h-5 text-amber-500" />
  return <XCircle className="w-5 h-5 text-red-500" />
}

function healthLabel(score: string) {
  if (score === 'green') return 'On Track'
  if (score === 'amber') return 'At Risk'
  return 'Delayed'
}

function healthBadgeVariant(score: string): 'success' | 'warning' | 'destructive' {
  if (score === 'green') return 'success'
  if (score === 'amber') return 'warning'
  return 'destructive'
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [budgetFilter, setBudgetFilter] = useState('all')

  const filteredBudgetProjects =
    budgetFilter === 'all'
      ? projectBudgetData
      : projectBudgetData.filter((p) => p.name === budgetFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Procurement intelligence and project performance insights
        </p>
      </div>

      <Tabs defaultValue="spend">
        <TabsList className="mb-4">
          <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="vendor">Vendor Performance</TabsTrigger>
          <TabsTrigger value="health">Project Health</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Spend Analysis ─────────────────────────────────────── */}
        <TabsContent value="spend" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Spend YTD"
              value="₹1.24 Cr"
              sub="FY 2025–26"
              icon={IndianRupee}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50 dark:bg-indigo-950"
            />
            <SummaryCard
              label="Avg Monthly Spend"
              value="₹18.2 L"
              sub="Last 12 months"
              icon={TrendingUp}
              iconColor="text-purple-600"
              iconBg="bg-purple-50 dark:bg-purple-950"
            />
            <SummaryCard
              label="Top Category"
              value="Steel — 34%"
              sub="By spend share"
              icon={Package}
              iconColor="text-pink-600"
              iconBg="bg-pink-50 dark:bg-pink-950"
            />
            <SummaryCard
              label="PO Count"
              value="47"
              sub="This financial year"
              icon={Users}
              iconColor="text-amber-600"
              iconBg="bg-amber-50 dark:bg-amber-950"
            />
          </div>

          {/* Bar Chart + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Monthly Procurement Spend (₹ Lakhs)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlySpendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `₹${v}L`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`₹${v} L`, 'Spend']} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="Spend" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Spend by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={spendByCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {spendByCategoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {spendByCategoryData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-sm inline-block"
                          style={{ backgroundColor: CATEGORY_COLORS[index] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 Items by Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left pb-2 font-medium">Rank</th>
                    <th className="text-left pb-2 font-medium">Item</th>
                    <th className="text-left pb-2 font-medium">Category</th>
                    <th className="text-right pb-2 font-medium">Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {topItemsBySpend.map((row, i) => (
                    <tr key={row.item} className="border-b last:border-0">
                      <td className="py-2.5 text-muted-foreground">#{i + 1}</td>
                      <td className="py-2.5 font-medium">{row.item}</td>
                      <td className="py-2.5">
                        <Badge variant="secondary" className="text-xs">{row.category}</Badge>
                      </td>
                      <td className="py-2.5 text-right font-semibold">{row.spend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Budget vs Actual ───────────────────────────────────── */}
        <TabsContent value="budget" className="space-y-6">
          {/* Project Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Project:</label>
            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value)}
              className="text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Projects</option>
              {projectBudgetData.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget vs Actual Spend — Monthly (₹ Lakhs)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={budgetVsActualData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `₹${v}L`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`₹${v} L`]} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ r: 4 }}
                    name="Budget"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Actual"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Budget Utilization */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBudgetProjects.map((proj) => {
              const over = proj.utilization > 90
              const warn = proj.utilization > 75 && proj.utilization <= 90
              const barColor = over
                ? 'bg-red-500'
                : warn
                ? 'bg-amber-500'
                : 'bg-emerald-500'
              return (
                <Card key={proj.name}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug">{proj.name}</p>
                      <Badge
                        variant={over ? 'destructive' : warn ? 'warning' : 'success'}
                        className="shrink-0 text-xs"
                      >
                        {proj.utilization}%
                      </Badge>
                    </div>
                    <Progress value={proj.utilization} className={`h-2 [&>div]:${barColor}`} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Spent: ₹{proj.spent} Cr</span>
                      <span>Budget: ₹{proj.budget} Cr</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ── Tab 3: Vendor Performance ─────────────────────────────────── */}
        <TabsContent value="vendor" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Avg Delivery Time"
              value="3.2 days"
              sub="vs target 3 days"
              icon={Clock}
              iconColor="text-blue-600"
              iconBg="bg-blue-50 dark:bg-blue-950"
            />
            <SummaryCard
              label="On-Time Rate"
              value="87%"
              sub="Last 90 days"
              icon={CheckCircle2}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50 dark:bg-emerald-950"
            />
            <SummaryCard
              label="Rejection Rate"
              value="2.1%"
              sub="Material QC fails"
              icon={XCircle}
              iconColor="text-red-600"
              iconBg="bg-red-50 dark:bg-red-950"
            />
            <SummaryCard
              label="Active Vendors"
              value="23"
              sub="Approved panel"
              icon={Users}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50 dark:bg-indigo-950"
            />
          </div>

          {/* Grouped Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendor Rating vs Spend (₹ Lakhs)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vendorChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="vendor" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(v) => `₹${v}L`} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="spend" fill="#6366f1" radius={[4, 4, 0, 0]} name="Spend (₹L)" />
                  <Bar yAxisId="right" dataKey="rating" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Rating (/5)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vendor Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendor Scorecard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left pb-2 font-medium">Vendor</th>
                      <th className="text-right pb-2 font-medium">Total Orders</th>
                      <th className="text-right pb-2 font-medium">On-Time %</th>
                      <th className="text-right pb-2 font-medium">Rejection %</th>
                      <th className="text-right pb-2 font-medium">Rating</th>
                      <th className="text-center pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorTableData.map((v) => (
                      <tr key={v.name} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{v.name}</td>
                        <td className="py-2.5 text-right">{v.orders}</td>
                        <td className={`py-2.5 text-right font-medium ${v.onTime >= 90 ? 'text-emerald-600' : v.onTime >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                          {v.onTime}%
                        </td>
                        <td className={`py-2.5 text-right font-medium ${v.rejection <= 1.5 ? 'text-emerald-600' : v.rejection <= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                          {v.rejection}%
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            {v.rating}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <Badge variant={v.status === 'active' ? 'success' : 'warning'} className="text-xs">
                            {v.status === 'active' ? 'Active' : 'Under Review'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Project Health ─────────────────────────────────────── */}
        <TabsContent value="health" className="space-y-6">
          {/* Health Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectHealthData.map((proj) => {
              const variance = proj.actual - proj.planned
              return (
                <Card key={proj.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <HealthIcon score={proj.score} />
                        <p className="text-sm font-semibold leading-snug">{proj.name}</p>
                      </div>
                      <Badge variant={healthBadgeVariant(proj.score)} className="shrink-0 text-xs">
                        {healthLabel(proj.score)}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress (Planned: {proj.planned}%)</span>
                        <span className={`font-medium ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          Actual: {proj.actual}% ({variance >= 0 ? '+' : ''}{variance}%)
                        </span>
                      </div>
                      <Progress value={proj.actual} className="h-2" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Phase: <span className="font-medium text-foreground">{proj.phase}</span></span>
                      <span>{proj.daysRemaining} days remaining</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Planned vs Actual Stacked / Grouped Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planned vs Actual Progress (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={projectHealthData.map((p) => ({
                    name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
                    Planned: p.planned,
                    Actual: p.actual,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="Planned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
