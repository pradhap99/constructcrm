'use client'
import { useState } from 'react'
import { FileText, CheckCircle, Clock, XCircle, Eye } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

const submittals = [
  { id: 'SUB-2024-001', type: 'shop_drawing', description: 'Structural Steel Beam Details - Grid A', project: 'Pune Metro Phase 3', submitted: '2024-01-02', reviewedBy: 'PMRDA Engineer', reviewDue: '2024-01-16', status: 'approved', revision: 'R0', submittedBy: 'Ramesh Iyer' },
  { id: 'SUB-2024-002', type: 'material_approval', description: 'TMT Fe500 Steel - Tata Steel Make', project: 'Pune Metro Phase 3', submitted: '2024-01-05', reviewedBy: 'PMRDA Engineer', reviewDue: '2024-01-19', status: 'approved', revision: 'R0', submittedBy: 'Ramesh Iyer' },
  { id: 'SUB-2024-003', type: 'shop_drawing', description: 'Precast Box Girder Reinforcement Details', project: 'Pune Metro Phase 3', submitted: '2024-01-08', reviewedBy: 'PMRDA Engineer', reviewDue: '2024-01-22', status: 'under_review', revision: 'R1', submittedBy: 'Ramesh Iyer' },
  { id: 'SUB-2024-004', type: 'method_statement', description: 'Concrete Pouring Procedure for Piers', project: 'Nashik Highway Bypass', submitted: '2024-01-10', reviewedBy: 'NHAI Site Engineer', reviewDue: '2024-01-24', status: 'under_review', revision: 'R0', submittedBy: 'Sunita Patil' },
  { id: 'SUB-2024-005', type: 'material_approval', description: 'OPC 53 Grade Cement - ACC Make', project: 'Nashik Highway Bypass', submitted: '2024-01-03', reviewedBy: 'NHAI Site Engineer', reviewDue: '2024-01-17', status: 'rejected', revision: 'R0', comment: 'Provide test certificates', submittedBy: 'Sunita Patil' },
  { id: 'SUB-2024-006', type: 'shop_drawing', description: 'Culvert Wing Wall Details km 14', project: 'Nashik Highway Bypass', submitted: '2024-01-12', reviewedBy: 'NHAI Site Engineer', reviewDue: '2024-01-26', status: 'draft', revision: 'R0', submittedBy: 'Sunita Patil' },
  { id: 'SUB-2024-007', type: 'itp', description: 'Inspection & Test Plan for Concrete Works', project: 'Aurangabad Industrial Park', submitted: '2024-01-14', reviewedBy: 'MIDC Engineer', reviewDue: '2024-01-28', status: 'submitted', revision: 'R0', submittedBy: 'Kiran Shah' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  approved:     { label: 'Approved',     color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  draft:        { label: 'Draft',        color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
}

const typeConfig: Record<string, { label: string; color: string }> = {
  shop_drawing:      { label: 'Shop Drawing',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  material_approval: { label: 'Material Approval', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  method_statement:  { label: 'Method Statement',  color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  itp:               { label: 'ITP',               color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
}

const STATUS_FILTERS = ['All', 'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'] as const
const TYPE_FILTERS   = ['All Types', 'Shop Drawing', 'Material Approval', 'Method Statement', 'ITP'] as const

const statusKeyMap: Record<string, string> = {
  'Draft': 'draft', 'Submitted': 'submitted', 'Under Review': 'under_review', 'Approved': 'approved', 'Rejected': 'rejected',
}
const typeLabelMap: Record<string, string> = {
  'Shop Drawing': 'shop_drawing', 'Material Approval': 'material_approval', 'Method Statement': 'method_statement', 'ITP': 'itp',
}

const TODAY = '2024-01-15'

export default function SubmittalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter]     = useState<string>('All Types')

  const filtered = submittals.filter(s => {
    const matchStatus = statusFilter === 'All' || s.status === statusKeyMap[statusFilter]
    const matchType   = typeFilter === 'All Types' || s.type === typeLabelMap[typeFilter]
    return matchStatus && matchType
  })

  const total      = submittals.length
  const approved   = submittals.filter(s => s.status === 'approved').length
  const underReview = submittals.filter(s => s.status === 'under_review').length
  const rejected   = submittals.filter(s => s.status === 'rejected').length

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submittals</h1>
            <p className="text-sm text-gray-500">Track shop drawings, material approvals, and technical documents</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          + New Submittal
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Submittals', value: total,      icon: <FileText className="w-5 h-5 text-indigo-500" />,  color: 'text-indigo-600' },
          { label: 'Approved',         value: approved,   icon: <CheckCircle className="w-5 h-5 text-green-500" />, color: 'text-green-600' },
          { label: 'Under Review',     value: underReview, icon: <Clock className="w-5 h-5 text-amber-500" />,      color: 'text-amber-600' },
          { label: 'Rejected',         value: rejected,   icon: <XCircle className="w-5 h-5 text-red-500" />,      color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
            {c.icon}
            <div>
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
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
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                typeFilter === f
                  ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-800 border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Submittal #', 'Type', 'Description', 'Project', 'Submitted', 'Review Due', 'Rev', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(s => {
              const isOverdue = s.status !== 'approved' && s.reviewDue < TODAY
              const tc = typeConfig[s.type]
              const sc = statusConfig[s.status]
              return (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-3 font-mono font-semibold text-indigo-600">{s.id}</td>
                  <td className="px-3 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', tc?.color)}>{tc?.label}</span>
                  </td>
                  <td className="px-3 py-3 max-w-xs truncate text-gray-800 dark:text-gray-200" title={s.description}>{s.description}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{s.project}</td>
                  <td className="px-3 py-3 text-gray-500">{formatDate(s.submitted)}</td>
                  <td className={cn('px-3 py-3', isOverdue ? 'text-red-600 font-medium' : 'text-gray-500')}>
                    {formatDate(s.reviewDue)}
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-gray-600 dark:text-gray-400">{s.revision}</td>
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
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">No submittals match the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
