'use client'
import { useState } from 'react'
import { Banknote, TrendingUp, Clock, AlertCircle, Eye, FileText } from 'lucide-react'
import { cn, formatDate, formatCurrencyCr } from '@/lib/utils'

const billingEntries = [
  { id: 'BILL-2024-001', project: 'Pune Metro Phase 3',       client: 'PMRDA',            milestone: 'Milestone 3: Pier P1-P6 Completion',     invoiceDate: '2024-01-05', dueDate: '2024-02-05', billedAmount: 21000000, retention: 1050000,  netPayable: 19950000, paid: 19950000, status: 'paid' },
  { id: 'BILL-2024-002', project: 'Pune Metro Phase 3',       client: 'PMRDA',            milestone: 'Milestone 4: Pier P7-P12 Completion',    invoiceDate: '2024-01-12', dueDate: '2024-02-12', billedAmount: 18500000, retention: 925000,   netPayable: 17575000, paid: 0,        status: 'pending' },
  { id: 'BILL-2024-003', project: 'Nashik Highway Bypass',    client: 'NHAI',             milestone: 'Running Account Bill #3',                invoiceDate: '2024-01-08', dueDate: '2024-02-08', billedAmount: 9500000,  retention: 475000,   netPayable: 9025000,  paid: 4512500,  status: 'partially_paid' },
  { id: 'BILL-2024-004', project: 'Solapur Water Treatment',  client: 'Solapur Municipal', milestone: 'Final Bill + DLP Certificate',          invoiceDate: '2023-12-15', dueDate: '2024-01-15', billedAmount: 4200000,  retention: 0,        netPayable: 4200000,  paid: 4200000,  status: 'paid' },
  { id: 'BILL-2024-005', project: 'Mumbai Coastal Road',      client: 'BMC',              milestone: 'Mobilization Advance Recovery',           invoiceDate: '2024-01-10', dueDate: '2024-02-10', billedAmount: 5500000,  retention: 275000,   netPayable: 5225000,  paid: 0,        status: 'overdue' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  paid:           { label: 'Paid',           color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  pending:        { label: 'Pending',        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  partially_paid: { label: 'Partially Paid', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  overdue:        { label: 'Overdue',        color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
}

const STATUS_FILTERS = ['All', 'Paid', 'Pending', 'Partially Paid', 'Overdue'] as const

const statusKeyMap: Record<string, string> = {
  'Paid': 'paid', 'Pending': 'pending', 'Partially Paid': 'partially_paid', 'Overdue': 'overdue',
}

const TODAY = '2024-01-15'

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const filtered = billingEntries.filter(b =>
    statusFilter === 'All' || b.status === statusKeyMap[statusFilter]
  )

  const totalBilled     = billingEntries.reduce((s, b) => s + b.billedAmount, 0)
  const totalCollected  = billingEntries.reduce((s, b) => s + b.paid, 0)
  const outstanding     = billingEntries
    .filter(b => b.status !== 'paid')
    .reduce((s, b) => s + (b.netPayable - b.paid), 0)
  const overdue         = billingEntries
    .filter(b => b.status === 'overdue')
    .reduce((s, b) => s + (b.netPayable - b.paid), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Billing</h1>
            <p className="text-sm text-gray-500">Track invoices raised to clients and collection status</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          + Raise Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Banknote className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-sm text-gray-500">Total Billed</p>
            <p className="text-xl font-bold text-indigo-600">{formatCurrencyCr(totalBilled)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm text-gray-500">Collected</p>
            <p className="text-xl font-bold text-green-600">{formatCurrencyCr(totalCollected)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm text-gray-500">Outstanding</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrencyCr(outstanding)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm text-gray-500">Overdue</p>
            <p className="text-xl font-bold text-red-600">{formatCurrencyCr(overdue)}</p>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 border text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Bill #', 'Project / Client', 'Milestone', 'Invoice Date', 'Due Date', 'Billed Amt', 'Paid Amt', 'Collection %', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(b => {
              const sc = statusConfig[b.status]
              const collectionPct = b.netPayable > 0 ? Math.round((b.paid / b.netPayable) * 100) : 0
              const isDueOverdue  = b.status !== 'paid' && b.dueDate < TODAY
              return (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-3 font-mono font-semibold text-indigo-600">{b.id}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{b.project}</div>
                    <div className="text-xs text-gray-400">{b.client}</div>
                  </td>
                  <td className="px-3 py-3 max-w-xs truncate text-gray-700 dark:text-gray-300" title={b.milestone}>{b.milestone}</td>
                  <td className="px-3 py-3 text-gray-500">{formatDate(b.invoiceDate)}</td>
                  <td className={cn('px-3 py-3', isDueOverdue ? 'text-red-600 font-medium' : 'text-gray-500')}>
                    {formatDate(b.dueDate)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">{formatCurrencyCr(b.billedAmount)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-green-600">{formatCurrencyCr(b.paid)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', collectionPct === 100 ? 'bg-green-500' : collectionPct > 0 ? 'bg-blue-500' : 'bg-gray-300')}
                          style={{ width: `${collectionPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{collectionPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sc?.color)}>{sc?.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700" title="Download">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-gray-400">No billing entries match the selected filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
