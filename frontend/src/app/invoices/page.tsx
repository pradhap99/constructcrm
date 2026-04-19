'use client'
import { Receipt, AlertCircle, CheckCircle, Clock } from 'lucide-react'

const invoices = [
  { id: '1', inv_no: 'INV-2024-001', vendor_inv: 'SLS/2024/101', vendor: 'Shree Lakshmi Steel', po: 'PO-2024-001', date: '2024-02-11', due: '2024-03-12', subtotal: 2850000, gst: 513000, total: 3363000, paid: 3363000, status: 'paid', match: 'matched' },
  { id: '2', inv_no: 'INV-2024-002', vendor_inv: 'RCM/INV/456', vendor: 'Raj Cement', po: 'PO-2024-002', date: '2024-02-13', due: '2024-03-14', subtotal: 990000, gst: 178200, total: 1168200, paid: 500000, status: 'partially_paid', match: 'mismatch' },
  { id: '3', inv_no: 'INV-2024-003', vendor_inv: 'PEW/24/789', vendor: 'Pioneer Electrical', po: 'PO-2024-003', date: '2024-02-16', due: '2024-03-17', subtotal: 750000, gst: 135000, total: 885000, paid: 0, status: 'pending', match: 'matched' },
  { id: '4', inv_no: 'INV-2024-004', vendor_inv: 'MHT/2024/202', vendor: 'Modern Hardware', po: 'PO-2024-004', date: '2024-01-26', due: '2024-02-25', subtotal: 450000, gst: 81000, total: 531000, paid: 531000, status: 'paid', match: 'matched' },
  { id: '5', inv_no: 'INV-2024-005', vendor_inv: 'EXP/24/303', vendor: 'Excel Paints', po: 'PO-2024-005', date: '2024-02-21', due: '2024-03-22', subtotal: 280000, gst: 50400, total: 330400, paid: 0, status: 'disputed', match: 'mismatch' },
]

const sc: Record<string,{label:string;color:string}> = {
  pending: { label:'Pending', color:'bg-amber-100 text-amber-700' },
  partially_paid: { label:'Partly Paid', color:'bg-blue-100 text-blue-700' },
  paid: { label:'Paid', color:'bg-green-100 text-green-700' },
  disputed: { label:'Disputed', color:'bg-red-100 text-red-700' },
}

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

export default function InvoicesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="w-7 h-7 text-indigo-600"/>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Management</h1>
            <p className="text-sm text-gray-500">Track vendor invoices and payment status</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">+ Upload Invoice</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Total Invoiced', value: fmt(invoices.reduce((s,i)=>s+i.total,0)), icon:<Receipt className="w-5 h-5 text-indigo-500"/>, color:'text-indigo-600' },
          { label:'Paid', value: fmt(invoices.reduce((s,i)=>s+i.paid,0)), icon:<CheckCircle className="w-5 h-5 text-green-500"/>, color:'text-green-600' },
          { label:'Outstanding', value: fmt(invoices.reduce((s,i)=>s+(i.total-i.paid),0)), icon:<Clock className="w-5 h-5 text-amber-500"/>, color:'text-amber-600' },
          { label:'Disputed', value: invoices.filter(i=>i.status==='disputed').length, icon:<AlertCircle className="w-5 h-5 text-red-500"/>, color:'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm flex items-center gap-3">
            {c.icon}
            <div><p className="text-sm text-gray-500">{c.label}</p><p className={`text-xl font-bold ${c.color}`}>{c.value}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Invoice#','Vendor Invoice#','Vendor','PO#','Date','Due','Total','Paid','Status','Match'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {invoices.map(inv => {
              const pct = Math.round((inv.paid/inv.total)*100)
              return (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-3 font-mono font-semibold text-indigo-600">{inv.inv_no}</td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500">{inv.vendor_inv}</td>
                  <td className="px-3 py-3 font-medium">{inv.vendor}</td>
                  <td className="px-3 py-3 font-mono text-xs">{inv.po}</td>
                  <td className="px-3 py-3 text-gray-500">{inv.date}</td>
                  <td className="px-3 py-3 text-gray-500">{inv.due}</td>
                  <td className="px-3 py-3 font-semibold">{fmt(inv.total)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{width:`${pct}%`}}/>
                      </div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${sc[inv.status]?.color}`}>{sc[inv.status]?.label}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${inv.match==='matched' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {inv.match==='matched' ? '✓ Matched' : '⚠ Mismatch'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
