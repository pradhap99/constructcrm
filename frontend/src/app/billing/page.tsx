'use client'
import { useState } from 'react'
import { Banknote, TrendingUp, Clock, AlertCircle, FileText, CalendarClock, ChevronDown, ChevronUp, Bot, Loader2, CheckCircle2 } from 'lucide-react'
import { cn, formatDate, formatCurrencyCr, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeductionBreakdown {
  security_deposit_pct: number  // % of gross
  it_tds_pct: number            // % of gross
  gst_tds_pct: number           // % of gross
  ld_amount: number             // ₹ fixed — Liquidated Damages
  labour_cess: number           // ₹ fixed
  material_recovery: number     // ₹ fixed
}

interface BillEntry {
  id: string
  project: string
  client: string
  milestone: string
  invoiceDate: string
  dueDate: string
  grossAmount: number
  deductions: DeductionBreakdown
  retentionPct: number
  paid: number
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDeductions(gross: number, d: DeductionBreakdown) {
  const sdAmt  = gross * d.security_deposit_pct / 100
  const itAmt  = gross * d.it_tds_pct / 100
  const gstAmt = gross * d.gst_tds_pct / 100
  const totalDed = sdAmt + itAmt + gstAmt + d.ld_amount + d.labour_cess + d.material_recovery
  const netPayable = gross - totalDed
  return { sdAmt, itAmt, gstAmt, totalDed, netPayable }
}

const TODAY = new Date('2024-01-15')
const AGING_STATUSES = new Set(['pending', 'partially_paid', 'overdue'])

function ageDays(invoiceDate: string) {
  return Math.floor((TODAY.getTime() - new Date(invoiceDate).getTime()) / 86400000)
}

function AgeBadge({ days }: { days: number }) {
  if (days > 60) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 ring-1 ring-red-400">OVERDUE · {days}d</span>
  if (days > 30) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">{days}d</span>
  if (days >= 15) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">{days}d</span>
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">{days}d</span>
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_BILLS: BillEntry[] = [
  {
    id: 'BILL-2024-001', project: 'Pune Metro Phase 3', client: 'PMRDA',
    milestone: 'Milestone 3: Pier P1-P6 Completion',
    invoiceDate: '2024-01-05', dueDate: '2024-02-05',
    grossAmount: 21000000, paid: 19950000, status: 'paid',
    retentionPct: 5,
    deductions: { security_deposit_pct: 2.5, it_tds_pct: 2, gst_tds_pct: 2, ld_amount: 0, labour_cess: 50000, material_recovery: 0 },
  },
  {
    id: 'BILL-2024-002', project: 'Pune Metro Phase 3', client: 'PMRDA',
    milestone: 'Milestone 4: Pier P7-P12 Completion',
    invoiceDate: '2023-11-20', dueDate: '2023-12-20',
    grossAmount: 18500000, paid: 0, status: 'pending',
    retentionPct: 5,
    deductions: { security_deposit_pct: 2.5, it_tds_pct: 2, gst_tds_pct: 2, ld_amount: 250000, labour_cess: 45000, material_recovery: 0 },
  },
  {
    id: 'BILL-2024-003', project: 'Nashik Highway Bypass', client: 'NHAI',
    milestone: 'Running Account Bill #3',
    invoiceDate: '2023-12-17', dueDate: '2024-01-17',
    grossAmount: 9500000, paid: 4512500, status: 'partially_paid',
    retentionPct: 5,
    deductions: { security_deposit_pct: 2.5, it_tds_pct: 2, gst_tds_pct: 2, ld_amount: 0, labour_cess: 22000, material_recovery: 0 },
  },
  {
    id: 'BILL-2024-004', project: 'Solapur Water Treatment', client: 'Solapur Municipal',
    milestone: 'Final Bill + DLP Certificate',
    invoiceDate: '2023-12-15', dueDate: '2024-01-15',
    grossAmount: 4200000, paid: 4200000, status: 'paid',
    retentionPct: 0,
    deductions: { security_deposit_pct: 0, it_tds_pct: 2, gst_tds_pct: 0, ld_amount: 0, labour_cess: 0, material_recovery: 0 },
  },
  {
    id: 'BILL-2024-005', project: 'Mumbai Coastal Road', client: 'BMC',
    milestone: 'Mobilization Advance Recovery',
    invoiceDate: '2023-10-28', dueDate: '2023-11-28',
    grossAmount: 5500000, paid: 0, status: 'overdue',
    retentionPct: 5,
    deductions: { security_deposit_pct: 2.5, it_tds_pct: 2, gst_tds_pct: 2, ld_amount: 500000, labour_cess: 15000, material_recovery: 150000 },
  },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  paid:           { label: 'Paid',           color: 'bg-green-100 text-green-700' },
  pending:        { label: 'Pending',        color: 'bg-amber-100 text-amber-700' },
  partially_paid: { label: 'Partially Paid', color: 'bg-blue-100 text-blue-700' },
  overdue:        { label: 'Overdue',        color: 'bg-red-100 text-red-700' },
}

const STATUS_FILTERS = ['All', 'Paid', 'Pending', 'Partially Paid', 'Overdue'] as const
const statusKeyMap: Record<string, string> = { Paid: 'paid', Pending: 'pending', 'Partially Paid': 'partially_paid', Overdue: 'overdue' }

// ─── Deduction Panel ──────────────────────────────────────────────────────────

interface DeductionPanelProps {
  gross: number
  retentionPct: number
  deductions: DeductionBreakdown
  onChange: (d: DeductionBreakdown) => void
}

function DeductionPanel({ gross, retentionPct, deductions, onChange }: DeductionPanelProps) {
  const d = deductions
  const { sdAmt, itAmt, gstAmt, totalDed, netPayable } = calcDeductions(gross, d)
  const retentionAmt = gross * retentionPct / 100

  function set(field: keyof DeductionBreakdown, val: number) {
    onChange({ ...d, [field]: isNaN(val) ? 0 : val })
  }

  const pctField = (
    label: string,
    field: 'security_deposit_pct' | 'it_tds_pct' | 'gst_tds_pct',
    amount: number,
  ) => (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="w-44 text-sm text-slate-600 dark:text-slate-300 shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0" max="100" step="0.5"
          value={d[field]}
          onChange={e => set(field, parseFloat(e.target.value))}
          className="w-16 text-right text-sm border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
        />
        <span className="text-slate-400 text-xs">%</span>
      </div>
      <span className="ml-auto text-sm font-medium text-slate-700 dark:text-slate-300">
        {formatCurrency(amount)}
      </span>
    </div>
  )

  const amtField = (
    label: string,
    field: 'ld_amount' | 'labour_cess' | 'material_recovery',
    hint?: string,
  ) => (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="w-44 text-sm text-slate-600 dark:text-slate-300 shrink-0">
        {label}
        {hint && <span className="text-xs text-slate-400 ml-1">({hint})</span>}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-slate-400 text-xs">₹</span>
        <input
          type="number"
          min="0"
          value={d[field]}
          onChange={e => set(field, parseFloat(e.target.value))}
          className="w-28 text-right text-sm border border-slate-200 dark:border-slate-600 rounded px-2 py-0.5 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
        />
      </div>
      <span className="ml-auto text-sm font-medium text-slate-700 dark:text-slate-300">
        {formatCurrency(d[field])}
      </span>
    </div>
  )

  return (
    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
      <div className="max-w-2xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Deduction Breakdown
        </h3>

        {/* Gross amount header */}
        <div className="flex items-center justify-between py-1.5 mb-1">
          <span className="w-44 text-sm font-semibold text-slate-700 dark:text-slate-200">Gross Certified Amount</span>
          <span className="ml-auto text-sm font-bold text-indigo-600">{formatCurrency(gross)}</span>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-1 mb-3">
          {/* % deductions */}
          {pctField('Security Deposit', 'security_deposit_pct', sdAmt)}
          {pctField('IT TDS', 'it_tds_pct', itAmt)}
          {pctField('GST TDS', 'gst_tds_pct', gstAmt)}
          {/* Fixed ₹ deductions */}
          {amtField('Liquidated Damages (LD)', 'ld_amount', 'delay penalty')}
          {amtField('Labour Cess', 'labour_cess')}
          {amtField('Material Recovery', 'material_recovery')}
        </div>

        {/* Retention row */}
        <div className="flex items-center justify-between py-1.5 bg-amber-50 dark:bg-amber-950/40 rounded px-3 mb-2 border border-amber-200 dark:border-amber-800">
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Retention @ {retentionPct}%
          </span>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {formatCurrency(retentionAmt)}
          </span>
        </div>

        {/* Total deductions */}
        <div className="flex items-center justify-between py-1.5 bg-red-50 dark:bg-red-950/40 rounded px-3 mb-2 border border-red-200 dark:border-red-800">
          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
            Total Deductions
          </span>
          <span className="text-sm font-bold text-red-700 dark:text-red-300">
            − {formatCurrency(totalDed + retentionAmt)}
          </span>
        </div>

        {/* Net payable */}
        <div className="flex items-center justify-between py-2 bg-green-50 dark:bg-green-950/40 rounded px-3 border-2 border-green-300 dark:border-green-700">
          <span className="text-sm font-bold text-green-800 dark:text-green-200">
            Net Payable
          </span>
          <span className="text-base font-bold text-green-700 dark:text-green-300">
            {formatCurrency(netPayable - retentionAmt)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type AgentState = 'idle' | 'running' | 'done'

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState('All')
  const [bills, setBills] = useState<BillEntry[]>(INITIAL_BILLS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [chaseStates, setChaseStates] = useState<Record<string, AgentState>>({})

  function runChase(id: string) {
    setChaseStates(prev => ({ ...prev, [id]: 'running' }))
    setTimeout(() => setChaseStates(prev => ({ ...prev, [id]: 'done' })), 3000)
  }

  const filtered = bills.filter(b =>
    statusFilter === 'All' || b.status === statusKeyMap[statusFilter]
  )

  const totalBilled   = bills.reduce((s, b) => s + b.grossAmount, 0)
  const totalCollected = bills.reduce((s, b) => s + b.paid, 0)
  const outstanding   = bills
    .filter(b => b.status !== 'paid')
    .reduce((s, b) => s + (calcDeductions(b.grossAmount, b.deductions).netPayable - b.grossAmount * b.retentionPct / 100 - b.paid), 0)
  const overdue       = bills
    .filter(b => b.status === 'overdue')
    .reduce((s, b) => s + calcDeductions(b.grossAmount, b.deductions).netPayable, 0)

  const unpaidBills = bills.filter(b => AGING_STATUSES.has(b.status))
  const avgDaysOut  = unpaidBills.length
    ? Math.round(unpaidBills.reduce((s, b) => s + ageDays(b.invoiceDate), 0) / unpaidBills.length)
    : 0

  function updateDeductions(id: string, d: DeductionBreakdown) {
    setBills(prev => prev.map(b => b.id === id ? { ...b, deductions: d } : b))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Billing</h1>
            <p className="text-sm text-gray-500">Track RA bills, deductions, and collection status</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          + Raise Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { icon: Banknote,      label: 'Total Billed',  value: formatCurrencyCr(totalBilled),    color: 'text-indigo-600', iconColor: 'text-indigo-500' },
          { icon: TrendingUp,    label: 'Collected',     value: formatCurrencyCr(totalCollected),  color: 'text-green-600',  iconColor: 'text-green-500'  },
          { icon: Clock,         label: 'Outstanding',   value: formatCurrencyCr(Math.abs(outstanding)), color: 'text-amber-600',  iconColor: 'text-amber-500'  },
          { icon: AlertCircle,   label: 'Overdue',       value: formatCurrencyCr(overdue),         color: 'text-red-600',    iconColor: 'text-red-500'    },
        ].map(({ icon: Icon, label, value, color, iconColor }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
            <Icon className={cn('w-5 h-5 shrink-0', iconColor)} />
            <div className="min-w-0">
              <p className="text-sm text-gray-500 truncate">{label}</p>
              <p className={cn('text-xl font-bold', color)}>{value}</p>
            </div>
          </div>
        ))}
        <div className={cn(
          'bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3',
          avgDaysOut > 60 ? 'border-red-300' : avgDaysOut > 30 ? 'border-amber-300' : ''
        )}>
          <CalendarClock className={cn('w-5 h-5 shrink-0', avgDaysOut > 60 ? 'text-red-500' : avgDaysOut > 30 ? 'text-amber-500' : 'text-slate-400')} />
          <div className="min-w-0">
            <p className="text-sm text-gray-500 truncate">Avg Days Out</p>
            <p className={cn('text-xl font-bold', avgDaysOut > 60 ? 'text-red-600' : avgDaysOut > 30 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200')}>
              {avgDaysOut}d
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 border text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            )}
          >{f}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Bill #', 'Project / Client', 'Milestone', 'Invoice Date', 'Due Date', 'Age', 'Gross Amt', 'Net Payable', 'Collected', 'Status', ''].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const sc    = statusConfig[b.status]
              const { netPayable, totalDed } = calcDeductions(b.grossAmount, b.deductions)
              const retentionAmt = b.grossAmount * b.retentionPct / 100
              const net   = netPayable - retentionAmt
              const collectionPct = net > 0 ? Math.min(100, Math.round(b.paid / net * 100)) : 0
              const isDueOverdue  = b.status !== 'paid' && b.dueDate < '2024-01-15'
              const days  = AGING_STATUSES.has(b.status) ? ageDays(b.invoiceDate) : null
              const isOpen = expandedId === b.id

              return (
                <>
                  <tr key={b.id}
                    className={cn('border-t transition-colors', isOpen ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700')}
                  >
                    <td className="px-3 py-3 font-mono font-semibold text-indigo-600 whitespace-nowrap">{b.id}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{b.project}</div>
                      <div className="text-xs text-gray-400">{b.client}</div>
                    </td>
                    <td className="px-3 py-3 max-w-[200px] truncate text-gray-700 dark:text-gray-300" title={b.milestone}>{b.milestone}</td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.invoiceDate)}</td>
                    <td className={cn('px-3 py-3 whitespace-nowrap', isDueOverdue ? 'text-red-600 font-medium' : 'text-gray-500')}>
                      {formatDate(b.dueDate)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {days !== null ? <AgeBadge days={days} /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">{formatCurrencyCr(b.grossAmount)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">{formatCurrencyCr(net)}</span>
                      {totalDed > 0 && (
                        <div className="text-[10px] text-red-500 font-medium">−{formatCurrencyCr(totalDed + retentionAmt)} ded.</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', collectionPct === 100 ? 'bg-green-500' : collectionPct > 0 ? 'bg-blue-500' : 'bg-gray-300')}
                            style={{ width: `${collectionPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{collectionPct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sc?.color)}>{sc?.label}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpandedId(isOpen ? null : b.id)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                            isOpen
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500'
                          )}
                          title="View / edit deductions"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {b.status !== 'paid' && (() => {
                          const cs = chaseStates[b.id] ?? 'idle'
                          return (
                            <button
                              onClick={() => runChase(b.id)}
                              disabled={cs === 'running'}
                              title="Run AI payment chase agent"
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                                cs === 'done'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : cs === 'running'
                                  ? 'bg-indigo-50 text-indigo-400 cursor-not-allowed'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                              )}
                            >
                              {cs === 'running' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : cs === 'done' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Bot className="w-3.5 h-3.5" />
                              )}
                              {cs === 'running' ? 'Chasing…' : cs === 'done' ? 'Chased' : 'Chase'}
                            </button>
                          )
                        })()}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${b.id}-ded`}>
                      <td colSpan={11} className="p-0">
                        <DeductionPanel
                          gross={b.grossAmount}
                          retentionPct={b.retentionPct}
                          deductions={b.deductions}
                          onChange={d => updateDeductions(b.id, d)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-400">No billing entries match the selected filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Aging legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="font-medium text-gray-500">Age legend:</span>
        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500">&lt; 15d</span>
        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">15 – 30d</span>
        <span className="px-2 py-0.5 rounded bg-red-100 text-red-600">&gt; 30d</span>
        <span className="px-2 py-0.5 rounded font-bold bg-red-100 text-red-700 ring-1 ring-red-400">OVERDUE &gt; 60d</span>
      </div>
    </div>
  )
}
