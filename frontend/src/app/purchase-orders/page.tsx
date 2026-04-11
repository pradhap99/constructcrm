'use client'
import { useState } from 'react'
import { ShoppingCart, Plus, Eye, FileText } from 'lucide-react'

const mockPOs = [
  { id: '1', po_number: 'PO-2024-001', vendor: 'Shree Lakshmi Steel', project: 'Phoenix Tower', amount: 2850000, gst: 513000, total: 3363000, status: 'acknowledged', date: '2024-01-15', delivery_date: '2024-02-15' },
  { id: '2', po_number: 'PO-2024-002', vendor: 'Raj Cement & Materials', project: 'Green Valley', amount: 1200000, gst: 216000, total: 1416000, status: 'partially_delivered', date: '2024-01-20', delivery_date: '2024-02-20' },
  { id: '3', po_number: 'PO-2024-003', vendor: 'Pioneer Electrical', project: 'Marina Bay', amount: 750000, gst: 135000, total: 885000, status: 'sent', date: '2024-01-25', delivery_date: '2024-03-01' },
  { id: '4', po_number: 'PO-2024-004', vendor: 'Modern Hardware', project: 'Phoenix Tower', amount: 450000, gst: 81000, total: 531000, status: 'completed', date: '2023-12-10', delivery_date: '2024-01-10' },
  { id: '5', po_number: 'PO-2024-005', vendor: 'Excel Paints', project: 'Green Valley', amount: 320000, gst: 57600, total: 377600, status: 'draft', date: '2024-02-01', delivery_date: '2024-03-15' },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  acknowledged: { label: 'Acknowledged', color: 'bg-indigo-100 text-indigo-700' },
  partially_delivered: { label: 'Partly Delivered', color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

export default function PurchaseOrdersPage() {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? mockPOs : mockPOs.filter(p => p.status === filter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
            <p className="text-sm text-gray-500">{mockPOs.length} total POs</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New PO
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: fmt(mockPOs.reduce((s, p) => s + p.total, 0)), color: 'text-indigo-600' },
          { label: 'Active POs', value: mockPOs.filter(p => ['sent','acknowledged','partially_delivered'].includes(p.status)).length, color: 'text-blue-600' },
          { label: 'Completed', value: mockPOs.filter(p => p.status === 'completed').length, color: 'text-green-600' },
          { label: 'Pending GST', value: fmt(mockPOs.reduce((s, p) => s + p.gst, 0)), color: 'text-amber-600' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['all', 'draft', 'sent', 'acknowledged', 'partially_delivered', 'completed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === 'all' ? 'All' : statusConfig[s]?.label || s}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['PO Number','Vendor','Project','Amount','GST','Total','Status','Date','Delivery','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(po => (
              <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{po.po_number}</td>
                <td className="px-4 py-3 font-medium">{po.vendor}</td>
                <td className="px-4 py-3 text-gray-600">{po.project}</td>
                <td className="px-4 py-3">{fmt(po.amount)}</td>
                <td className="px-4 py-3 text-amber-600">{fmt(po.gst)}</td>
                <td className="px-4 py-3 font-semibold">{fmt(po.total)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[po.status]?.color}`}>
                    {statusConfig[po.status]?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{po.date}</td>
                <td className="px-4 py-3 text-gray-500">{po.delivery_date}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="p-1 text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                  <button className="p-1 text-gray-400 hover:text-green-600"><FileText className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
