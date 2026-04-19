'use client'

import { useState, useMemo } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock, Search, Filter,
  Package, TrendingDown, IndianRupee, Layers, Bot, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type MaterialStatus = 'mismatch' | 'match' | 'pending'

interface Material {
  id: string
  itemCode: string
  description: string
  workPackage: string
  project: string
  unit: string
  orderedQty: number
  receivedQty: number
  installedQty: number
  rate: number
  status: MaterialStatus
}

const MATERIALS: Material[] = [
  {
    id: 'm1', itemCode: 'STL-001', description: 'TMT Reinforcement Bar Fe500D 12mm',
    workPackage: 'Structural', project: 'PROJ-2024-001', unit: 'MT',
    orderedQty: 120, receivedQty: 95, installedQty: 72, rate: 68000, status: 'mismatch',
  },
  {
    id: 'm2', itemCode: 'CEM-001', description: 'OPC 53 Grade Portland Cement',
    workPackage: 'Concrete', project: 'PROJ-2024-001', unit: 'Bags',
    orderedQty: 5000, receivedQty: 3200, installedQty: 3200, rate: 380, status: 'pending',
  },
  {
    id: 'm3', itemCode: 'BRK-002', description: 'Fly Ash Brick 230×115×75mm',
    workPackage: 'Masonry', project: 'PROJ-2024-002', unit: 'Nos',
    orderedQty: 80000, receivedQty: 80000, installedQty: 76500, rate: 8, status: 'match',
  },
  {
    id: 'm4', itemCode: 'STL-003', description: 'MS Hollow Section 50×50×3mm',
    workPackage: 'Structural', project: 'PROJ-2024-002', unit: 'MT',
    orderedQty: 45, receivedQty: 28, installedQty: 15, rate: 72000, status: 'mismatch',
  },
  {
    id: 'm5', itemCode: 'PIP-001', description: 'CPVC Pipe 25mm Class 5',
    workPackage: 'Plumbing', project: 'PROJ-2024-003', unit: 'Rmt',
    orderedQty: 1200, receivedQty: 1200, installedQty: 1150, rate: 145, status: 'match',
  },
  {
    id: 'm6', itemCode: 'TIL-002', description: 'Vitrified Floor Tile 600×600mm',
    workPackage: 'Finishing', project: 'PROJ-2024-003', unit: 'Sqm',
    orderedQty: 3500, receivedQty: 2100, installedQty: 1800, rate: 850, status: 'mismatch',
  },
  {
    id: 'm7', itemCode: 'PNT-001', description: 'Exterior Emulsion Paint (20L)',
    workPackage: 'Finishing', project: 'PROJ-2024-001', unit: 'Pails',
    orderedQty: 200, receivedQty: 200, installedQty: 200, rate: 3200, status: 'match',
  },
  {
    id: 'm8', itemCode: 'ELE-005', description: 'XLPE Armoured Cable 4×16mm²',
    workPackage: 'Electrical', project: 'PROJ-2024-002', unit: 'Rmt',
    orderedQty: 800, receivedQty: 450, installedQty: 0, rate: 320, status: 'pending',
  },
  {
    id: 'm9', itemCode: 'STL-007', description: 'Structural Steel Column Section ISHB200',
    workPackage: 'Structural', project: 'PROJ-2024-004', unit: 'MT',
    orderedQty: 30, receivedQty: 18, installedQty: 10, rate: 85000, status: 'mismatch',
  },
  {
    id: 'm10', itemCode: 'CON-001', description: 'Ready-Mix Concrete M30 Grade',
    workPackage: 'Concrete', project: 'PROJ-2024-004', unit: 'CuM',
    orderedQty: 600, receivedQty: 420, installedQty: 420, rate: 5800, status: 'match',
  },
]

const STATUS_CONFIG: Record<MaterialStatus, { label: string; icon: React.ReactNode; badge: string }> = {
  mismatch: {
    label: 'Mismatch',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  match: {
    label: 'Match',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

const fmtCurrency = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

function valueAtRisk(m: Material): number {
  const mismatchQty = Math.max(0, m.receivedQty - m.installedQty)
  return m.status === 'mismatch' ? mismatchQty * m.rate : 0
}

type AgentState = 'idle' | 'running' | 'done'

export default function MaterialsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | 'all'>('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [agentState, setAgentState] = useState<AgentState>('idle')

  function runReconciliation() {
    setAgentState('running')
    setTimeout(() => setAgentState('done'), 3000)
  }

  const projects = useMemo(() => Array.from(new Set(MATERIALS.map((m) => m.project))), [])

  const filtered = useMemo(() => {
    let rows = [...MATERIALS]
    // mismatches first
    rows.sort((a, b) => {
      const order: Record<MaterialStatus, number> = { mismatch: 0, pending: 1, match: 2 }
      return order[a.status] - order[b.status]
    })
    if (statusFilter !== 'all') rows = rows.filter((m) => m.status === statusFilter)
    if (projectFilter !== 'all') rows = rows.filter((m) => m.project === projectFilter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (m) =>
          m.description.toLowerCase().includes(q) ||
          m.itemCode.toLowerCase().includes(q) ||
          m.workPackage.toLowerCase().includes(q)
      )
    }
    return rows
  }, [search, statusFilter, projectFilter])

  const totalVAR = useMemo(() => MATERIALS.reduce((s, m) => s + valueAtRisk(m), 0), [])
  const mismatchCount = MATERIALS.filter((m) => m.status === 'mismatch').length
  const totalOrdered = MATERIALS.reduce((s, m) => s + m.orderedQty * m.rate, 0)
  const totalInstalled = MATERIALS.reduce((s, m) => s + m.installedQty * m.rate, 0)

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Materials Tracker</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track ordered, received, and installed quantities across all projects
          </p>
        </div>
        <button
          onClick={runReconciliation}
          disabled={agentState === 'running'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0',
            agentState === 'done'
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : agentState === 'running'
              ? 'bg-indigo-50 text-indigo-400 border border-indigo-200 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
        >
          {agentState === 'running' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : agentState === 'done' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          {agentState === 'running' ? 'Running AI Reconciliation…' : agentState === 'done' ? 'Reconciliation Complete' : 'Run AI Reconciliation'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-100 dark:bg-red-800/50 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
              Value at Risk
            </span>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{fmtCurrency(totalVAR)}</p>
          <p className="text-xs text-red-500 mt-0.5">{mismatchCount} items with mismatch</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Ordered</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{fmtCurrency(totalOrdered)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{MATERIALS.length} line items</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Installed Value</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{fmtCurrency(totalInstalled)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalOrdered > 0 ? Math.round((totalInstalled / totalOrdered) * 100) : 0}% of ordered
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mismatches</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{mismatchCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Need reconciliation</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MaterialStatus | 'all')}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="mismatch">Mismatch</option>
            <option value="pending">Pending</option>
            <option value="match">Match</option>
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Item</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Work Package</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Project</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Ordered</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Received</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Installed</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Rate</th>
                <th className="text-right px-4 py-3 font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                  Value at Risk
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((m) => {
                const var_ = valueAtRisk(m)
                const cfg = STATUS_CONFIG[m.status]
                const installedPct = m.receivedQty > 0
                  ? Math.min(100, Math.round((m.installedQty / m.receivedQty) * 100))
                  : 0

                return (
                  <tr
                    key={m.id}
                    className={
                      m.status === 'mismatch'
                        ? 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{m.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.itemCode} · {m.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{m.workPackage}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">{m.project}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 font-mono">{fmt(m.orderedQty)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 font-mono">{fmt(m.receivedQty)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{fmt(m.installedQty)}</span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-1">
                          <div
                            className="bg-emerald-500 h-1 rounded-full"
                            style={{ width: `${installedPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">{installedPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {fmtCurrency(m.rate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {var_ > 0 ? (
                        <span className="font-semibold text-red-600 dark:text-red-400 font-mono">
                          {fmtCurrency(var_)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No materials found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer totals */}
        <div className="border-t border-slate-200 dark:border-slate-600 px-4 py-3 bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            Showing {filtered.length} of {MATERIALS.length} items
          </span>
          <div className="flex items-center gap-6">
            <span className="text-slate-600 dark:text-slate-300">
              Total VAR:{' '}
              <span className="font-bold text-red-600 dark:text-red-400">{fmtCurrency(totalVAR)}</span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              Installed value:{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(totalInstalled)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
