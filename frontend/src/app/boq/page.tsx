'use client'
import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { formatCurrency, formatCurrencyCr, formatPercent } from '@/lib/utils'

const BOQ_ITEMS = [
  { id: '1', sno: '1', category: 'Civil Works', itemCode: 'CW-001', description: 'Earth Excavation in all types of soil', unit: 'Cum', quantity: 12500, rate: 185, amount: 2312500, completedQty: 7200, completedAmt: 1332000 },
  { id: '2', sno: '2', category: 'Civil Works', itemCode: 'CW-002', description: 'PCC M10 grade concrete', unit: 'Cum', quantity: 3200, rate: 4800, amount: 15360000, completedQty: 1800, completedAmt: 8640000 },
  { id: '3', sno: '3', category: 'Civil Works', itemCode: 'CW-003', description: 'RCC M30 grade concrete for piers', unit: 'Cum', quantity: 8500, rate: 7200, amount: 61200000, completedQty: 3400, completedAmt: 24480000 },
  { id: '4', sno: '4', category: 'Civil Works', itemCode: 'CW-004', description: 'TMT Fe500 Steel Reinforcement', unit: 'MT', quantity: 2100, rate: 72000, amount: 151200000, completedQty: 920, completedAmt: 66240000 },
  { id: '5', sno: '5', category: 'Structural Steel', itemCode: 'SS-001', description: 'Structural steel fabrication and erection', unit: 'MT', quantity: 850, rate: 125000, amount: 106250000, completedQty: 280, completedAmt: 35000000 },
  { id: '6', sno: '6', category: 'Structural Steel', itemCode: 'SS-002', description: 'Precast box girder segments', unit: 'Nos', quantity: 420, rate: 285000, amount: 119700000, completedQty: 168, completedAmt: 47880000 },
  { id: '7', sno: '7', category: 'Electrical', itemCode: 'EL-001', description: 'HT Cable 11KV XLPE 3x240mm²', unit: 'Mtr', quantity: 12000, rate: 1850, amount: 22200000, completedQty: 4500, completedAmt: 8325000 },
  { id: '8', sno: '8', category: 'Electrical', itemCode: 'EL-002', description: 'Transformer 11KV/433V 500KVA', unit: 'Nos', quantity: 8, rate: 850000, amount: 6800000, completedQty: 3, completedAmt: 2550000 },
  { id: '9', sno: '9', category: 'Finishing', itemCode: 'FN-001', description: 'Waterproofing treatment for structures', unit: 'Sqm', quantity: 25000, rate: 450, amount: 11250000, completedQty: 0, completedAmt: 0 },
  { id: '10', sno: '10', category: 'Finishing', itemCode: 'FN-002', description: 'Anti-corrosion coating for steel', unit: 'Sqm', quantity: 18000, rate: 320, amount: 5760000, completedQty: 0, completedAmt: 0 },
]

const CATEGORIES = ['All', 'Civil Works', 'Structural Steel', 'Electrical', 'Finishing']

const totalBOQ = BOQ_ITEMS.reduce((s, i) => s + i.amount, 0)
const totalCompleted = BOQ_ITEMS.reduce((s, i) => s + i.completedAmt, 0)

export default function BOQPage() {
  const [categoryFilter, setCategoryFilter] = useState('All')

  const filtered = categoryFilter === 'All'
    ? BOQ_ITEMS
    : BOQ_ITEMS.filter(i => i.category === categoryFilter)

  const filteredTotal = filtered.reduce((s, i) => s + i.amount, 0)
  const filteredCompletedAmt = filtered.reduce((s, i) => s + i.completedAmt, 0)
  const filteredCompletedQty = filtered.reduce((s, i) => s + i.completedQty, 0)

  // Group by category preserving order
  const categoriesInView = CATEGORIES.slice(1).filter(c =>
    categoryFilter === 'All' || c === categoryFilter
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bill of Quantities</h1>
            <p className="text-sm text-gray-500">Full cost breakdown and completion tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Project:</span>
          <select
            disabled
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-80"
          >
            <option>Pune Metro Phase 3</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total BOQ Value', value: formatCurrencyCr(totalBOQ), color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800' },
          { label: 'Completed Value', value: formatCurrencyCr(totalCompleted), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800' },
          { label: 'Balance', value: formatCurrencyCr(totalBOQ - totalCompleted), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800' },
          { label: 'Overall Progress', value: formatPercent(totalCompleted / totalBOQ * 100), color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-800' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border ${card.border} rounded-lg p-4`}>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['S.No', 'Item Code', 'Description', 'Unit', 'Qty', 'Rate ₹', 'BOQ Amount', 'Completed Qty', 'Completed Amt', 'Progress'].map(h => (
                <th
                  key={h}
                  className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${
                    ['Qty', 'Rate ₹', 'BOQ Amount', 'Completed Qty', 'Completed Amt'].includes(h) ? 'text-right' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {categoriesInView.map(cat => {
              const items = filtered.filter(i => i.category === cat)
              if (items.length === 0) return null
              return (
                <>
                  {/* Category header row */}
                  <tr key={`cat-${cat}`} className="bg-gray-50/80 dark:bg-gray-700/50">
                    <td colSpan={10} className="px-3 py-2 font-medium text-sm text-gray-700 dark:text-gray-300">
                      {cat}
                    </td>
                  </tr>
                  {items.map(item => {
                    const pct = item.quantity > 0 ? (item.completedQty / item.quantity) * 100 : 0
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3 text-gray-500">{item.sno}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-400">{item.itemCode}</td>
                        <td className="px-3 py-3 max-w-xs truncate text-gray-800 dark:text-gray-200" title={item.description}>
                          {item.description}
                        </td>
                        <td className="px-3 py-3 text-gray-500">{item.unit}</td>
                        <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(item.rate)}</td>
                        <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-gray-200">{formatCurrencyCr(item.amount)}</td>
                        <td className="px-3 py-3 text-right text-green-600 font-medium">{item.completedQty.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-3 text-right text-green-600 font-medium">{item.completedAmt > 0 ? formatCurrencyCr(item.completedAmt) : '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden flex-shrink-0">
                              <div
                                className="h-full bg-indigo-500 rounded"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{formatPercent(pct)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </>
              )
            })}

            {/* Footer total row */}
            <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-500 font-bold">
              <td colSpan={4} className="px-3 py-3 text-gray-800 dark:text-gray-200 uppercase text-xs tracking-wide">TOTAL</td>
              <td className="px-3 py-3 text-right text-gray-800 dark:text-gray-200">—</td>
              <td className="px-3 py-3 text-right text-gray-800 dark:text-gray-200">—</td>
              <td className="px-3 py-3 text-right text-gray-900 dark:text-white">{formatCurrencyCr(filteredTotal)}</td>
              <td className="px-3 py-3 text-right text-green-700">{filteredCompletedQty.toLocaleString('en-IN')}</td>
              <td className="px-3 py-3 text-right text-green-700">{formatCurrencyCr(filteredCompletedAmt)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden flex-shrink-0">
                    <div
                      className="h-full bg-indigo-500 rounded"
                      style={{ width: `${filteredTotal > 0 ? Math.min((filteredCompletedAmt / filteredTotal) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {filteredTotal > 0 ? formatPercent((filteredCompletedAmt / filteredTotal) * 100) : '0.0%'}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
