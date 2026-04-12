'use client'
import { useState } from 'react'
import { Package, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

const mockGRNs = [
  { id: '1', grn_number: 'GRN-2024-001', po_number: 'PO-2024-001', vendor: 'Shree Lakshmi Steel', date: '2024-02-10', po_qty: 52, grn_qty: 52, invoice_qty: 52, status: 'confirmed', match: 'matched' },
  { id: '2', grn_number: 'GRN-2024-002', po_number: 'PO-2024-002', vendor: 'Raj Cement', date: '2024-02-12', po_qty: 200, grn_qty: 180, invoice_qty: 200, status: 'discrepancy', match: 'mismatch' },
  { id: '3', grn_number: 'GRN-2024-003', po_number: 'PO-2024-003', vendor: 'Pioneer Electrical', date: '2024-02-15', po_qty: 30, grn_qty: 30, invoice_qty: null, status: 'confirmed', match: 'pending' },
  { id: '4', grn_number: 'GRN-2024-004', po_number: 'PO-2024-004', vendor: 'Modern Hardware', date: '2024-01-25', po_qty: 150, grn_qty: 150, invoice_qty: 150, status: 'confirmed', match: 'matched' },
  { id: '5', grn_number: 'GRN-2024-005', po_number: 'PO-2024-005', vendor: 'Excel Paints', date: '2024-02-20', po_qty: 80, grn_qty: 75, invoice_qty: 80, status: 'discrepancy', match: 'mismatch' },
]

const matchIcon = { matched: <CheckCircle className="w-4 h-4 text-green-500"/>, mismatch: <AlertTriangle className="w-4 h-4 text-red-500"/>, pending: <Clock className="w-4 h-4 text-amber-500"/> }
const matchLabel = { matched: 'Matched', mismatch: 'Mismatch', pending: 'Invoice Pending' }
const matchColor = { matched: 'bg-green-100 text-green-700', mismatch: 'bg-red-100 text-red-700', pending: 'bg-amber-100 text-amber-700' }

export default function GRNPage() {
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? mockGRNs : mockGRNs.filter(g => g.match === filter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-indigo-600"/>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GRN & 3-Way Match</h1>
            <p className="text-sm text-gray-500">Goods Receipt Notes — PO vs GRN vs Invoice</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">+ New GRN</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Matched', count: mockGRNs.filter(g => g.match==='matched').length, icon: <CheckCircle className="w-5 h-5 text-green-500"/>, bg: 'bg-green-50' },
          { label: 'Mismatch', count: mockGRNs.filter(g => g.match==='mismatch').length, icon: <AlertTriangle className="w-5 h-5 text-red-500"/>, bg: 'bg-red-50' },
          { label: 'Pending Invoice', count: mockGRNs.filter(g => g.match==='pending').length, icon: <Clock className="w-5 h-5 text-amber-500"/>, bg: 'bg-amber-50' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-lg border p-4 flex items-center gap-4`}>
            {c.icon}
            <div><p className="text-2xl font-bold">{c.count}</p><p className="text-sm text-gray-600">{c.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['all','matched','mismatch','pending'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter===f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'all' ? 'All GRNs' : matchLabel[f as keyof typeof matchLabel]}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['GRN#','PO#','Vendor','Date','PO Qty','GRN Qty','Inv Qty','3-Way Match','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(grn => (
              <tr key={grn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{grn.grn_number}</td>
                <td className="px-4 py-3 font-mono text-sm">{grn.po_number}</td>
                <td className="px-4 py-3 font-medium">{grn.vendor}</td>
                <td className="px-4 py-3 text-gray-500">{grn.date}</td>
                <td className="px-4 py-3">{grn.po_qty}</td>
                <td className={`px-4 py-3 font-semibold ${grn.grn_qty < grn.po_qty ? 'text-amber-600' : 'text-green-600'}`}>{grn.grn_qty}</td>
                <td className="px-4 py-3 text-gray-500">{grn.invoice_qty ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${matchColor[grn.match as keyof typeof matchColor]}`}>
                    {matchIcon[grn.match as keyof typeof matchIcon]}
                    {matchLabel[grn.match as keyof typeof matchLabel]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${grn.status==='confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {grn.status === 'confirmed' ? 'Confirmed' : 'Discrepancy'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
