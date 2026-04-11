'use client'
import { ShoppingCart, ArrowLeft, Truck, Calendar, CreditCard } from 'lucide-react'
import Link from 'next/link'

const po = {
  po_number: 'PO-2024-001', vendor: 'Shree Lakshmi Steel Suppliers', project: 'Phoenix Commercial Tower',
  status: 'acknowledged', date: '2024-01-15', delivery_date: '2024-02-15',
  payment_terms: '30 days from delivery', freight_terms: 'FOR Destination', gstin_vendor: '29AADCS1234F1Z5',
  items: [
    { desc: 'TMT Steel Bars Fe500D 12mm', qty: 50, unit: 'MT', rate: 55000, gst_pct: 18, amount: 2750000 },
    { desc: 'TMT Steel Bars Fe500D 16mm', qty: 2, unit: 'MT', rate: 55000, gst_pct: 18, amount: 110000 },
  ],
  subtotal: 2860000, gst: 514800, total: 3374800,
}

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

export default function PODetailPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <ShoppingCart className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-bold">{po.po_number}</h1>
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">Acknowledged</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Truck className="w-3 h-3"/>Vendor</p>
          <p className="font-semibold">{po.vendor}</p>
          <p className="text-xs text-gray-400">GSTIN: {po.gstin_vendor}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/>Delivery</p>
          <p className="font-semibold">{po.delivery_date}</p>
          <p className="text-xs text-gray-400">{po.freight_terms}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3"/>Payment</p>
          <p className="font-semibold">{po.payment_terms}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-700">
          <h2 className="font-semibold text-sm">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['#','Description','Qty','Unit','Unit Rate','GST%','Amount'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {po.items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{i+1}</td>
                <td className="px-4 py-3 font-medium">{item.desc}</td>
                <td className="px-4 py-3">{item.qty}</td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3">{fmt(item.rate)}</td>
                <td className="px-4 py-3">{item.gst_pct}%</td>
                <td className="px-4 py-3 font-semibold">{fmt(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr><td colSpan={6} className="px-4 py-2 text-right font-medium text-gray-600">Subtotal</td><td className="px-4 py-2 font-semibold">{fmt(po.subtotal)}</td></tr>
            <tr><td colSpan={6} className="px-4 py-2 text-right font-medium text-amber-600">GST</td><td className="px-4 py-2 font-semibold text-amber-600">{fmt(po.gst)}</td></tr>
            <tr><td colSpan={6} className="px-4 py-2 text-right font-bold text-lg">Total</td><td className="px-4 py-2 font-bold text-lg text-indigo-600">{fmt(po.total)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
