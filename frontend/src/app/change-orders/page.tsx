'use client'
import { useState } from 'react'
import { GitPullRequest, TrendingUp, Clock, Calendar, Eye } from 'lucide-react'
import { cn, formatDate, formatCurrencyCr } from '@/lib/utils'

const changeOrders = [
  { id: 'CO-2024-001', project: 'Pune Metro Phase 3',       description: 'Additional Pile Foundation for Pier P7 due to poor soil conditions',  type: 'addition',     amount: 2850000,   status: 'approved', submitted: '2024-01-03', approved: '2024-01-10', impactDays: 15,  submittedBy: 'Ramesh Iyer' },
  { id: 'CO-2024-002', project: 'Pune Metro Phase 3',       description: 'Deletion of temporary access road - alternate route available',       type: 'deletion',     amount: -420000,   status: 'approved', submitted: '2023-12-20', approved: '2023-12-28', impactDays: 0,   submittedBy: 'Ramesh Iyer' },
  { id: 'CO-2024-003', project: 'Nashik Highway Bypass',    description: 'Grade change from WMM to DBM for km 12-15 stretch',                  type: 'substitution', amount: 1280000,   status: 'pending',  submitted: '2024-01-08', approved: null,         impactDays: 7,   submittedBy: 'Sunita Patil' },
  { id: 'CO-2024-004', project: 'Nashik Highway Bypass',    description: 'Additional culverts at km 13.5 due to drainage survey',              type: 'addition',     amount: 1850000,   status: 'pending',  submitted: '2024-01-12', approved: null,         impactDays: 10,  submittedBy: 'Sunita Patil' },
  { id: 'CO-2024-005', project: 'Aurangabad Industrial Park', description: 'Scope reduction: Remove parking structure Phase 2',               type: 'deletion',     amount: -8500000,  status: 'rejected', submitted: '2024-01-05', approved: null,         impactDays: -30, submittedBy: 'Kiran Shah' },
  { id: 'CO-2024-006', project: 'Mumbai Coastal Road',      description: 'Change in specification: M35 grade RCC instead of M30',             type: 'substitution', amount: 4200000,   status: 'draft',    submitted: '2024-01-14', approved: null,         impactDays: 0,   submittedBy: 'Arjun Mehta' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  draft:    { label: 'Draft',    color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
}

const typeConfig: Record<string, { label: string; color: string }> = {
  addition:     { label: 'Addition',     color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  deletion:     { label: 'Deletion',     color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  substitution: { label: 'Substitution', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
}

const STATUS_FILTERS = ['All', 'Draft', 'Pending', 'Approved', 'Rejected'] as const

function formatImpact(days: number): string {
  if (days === 0) return '0 days'
  return days > 0 ? `+${days} days` : `${days} days`
}

export default function ChangeOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const filtered = changeOrders.filter(co =>
    statusFilter === 'All' || co.status === statusFilter.toLowerCase()
  )

  const approvedOrders  = changeOrders.filter(co => co.status === 'approved')
  const pendingOrders   = changeOrders.filter(co => co.status === 'pending')
  const approvedValue   = approvedOrders.reduce((s, co) => s + co.amount, 0)
  const pendingValue    = pendingOrders.reduce((s, co) => s + co.amount, 0)
  const scheduleImpact  = approvedOrders.reduce((s, co) => s + co.impactDays, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitPullRequest className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Orders</h1>
            <p className="text-sm text-gray-500">Manage scope changes affecting project budget and timeline</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          + New Change Order
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <GitPullRequest className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-sm text-gray-500">Total Change Orders</p>
            <p className="text-xl font-bold text-indigo-600">{changeOrders.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-sm text-gray-500">Approved Value</p>
            <p className={cn('text-xl font-bold', approvedValue >= 0 ? 'text-green-600' : 'text-red-600')}>
              {approvedValue >= 0 ? '+' : ''}{formatCurrencyCr(Math.abs(approvedValue))}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm text-gray-500">Pending Value</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrencyCr(pendingValue)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Schedule Impact</p>
            <p className="text-xl font-bold text-blue-600">+{scheduleImpact} days</p>
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
              {['CO #', 'Project', 'Description', 'Type', 'Amount', 'Schedule Impact', 'Submitted', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(co => {
              const sc = statusConfig[co.status]
              const tc = typeConfig[co.type]
              const amountPositive = co.amount >= 0
              return (
                <tr key={co.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-3 font-mono font-semibold text-indigo-600">{co.id}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{co.project}</td>
                  <td className="px-3 py-3 max-w-xs truncate text-gray-800 dark:text-gray-200" title={co.description}>{co.description}</td>
                  <td className="px-3 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', tc?.color)}>{tc?.label}</span>
                  </td>
                  <td className={cn('px-3 py-3 text-right font-semibold', amountPositive ? 'text-green-600' : 'text-red-600')}>
                    {amountPositive ? '+' : ''}{formatCurrencyCr(co.amount)}
                  </td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{formatImpact(co.impactDays)}</td>
                  <td className="px-3 py-3 text-gray-500">{formatDate(co.submitted)}</td>
                  <td className="px-3 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', sc?.color)}>{sc?.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">No change orders match the selected filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
