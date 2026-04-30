'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  Package, Search, AlertTriangle, CheckCircle2, Loader2,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import { formatCurrencyShort } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NOT_ORDERED: { label: 'Not Ordered',  color: 'bg-slate-100 text-slate-600' },
  PO_RAISED:   { label: 'PO Raised',    color: 'bg-blue-100 text-blue-700' },
  DELIVERED:   { label: 'Delivered',    color: 'bg-green-100 text-green-700' },
  INSTALLED:   { label: 'Installed',    color: 'bg-emerald-100 text-emerald-700' },
  ON_HOLD:     { label: 'On Hold',      color: 'bg-amber-100 text-amber-700' },
  MISMATCH:    { label: 'Spec Mismatch', color: 'bg-red-100 text-red-700' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.getMaterials(),
  });

  const filtered = (materials as any[])
    .filter((m: any) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.specification?.toLowerCase().includes(search.toLowerCase()) ||
        m.supplierName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const matchProject = projectFilter === 'ALL' || m.projectId === projectFilter;
      return matchSearch && matchStatus && matchProject;
    })
    .sort((a: any, b: any) => {
      if (a.status === 'MISMATCH' && b.status !== 'MISMATCH') return -1;
      if (b.status === 'MISMATCH' && a.status !== 'MISMATCH') return 1;
      return 0;
    });

  const stats = {
    total: (materials as any[]).length,
    mismatches: (materials as any[]).filter((m: any) => m.status === 'MISMATCH').length,
    delivered: (materials as any[]).filter((m: any) => ['DELIVERED', 'INSTALLED'].includes(m.status)).length,
    onOrder: (materials as any[]).filter((m: any) => m.status === 'PO_RAISED').length,
    valueAtRisk: (materials as any[])
      .filter((m: any) => m.status === 'MISMATCH')
      .reduce((s: number, m: any) => {
        const diff = Math.abs(parseFloat(m.quantityBilled || 0) - parseFloat(m.quantityDelivered || 0));
        return s + diff * parseFloat(m.ratePerUnit || 0);
      }, 0),
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Materials</h1>
          <p className="text-slate-500 text-sm mt-1">
            Reconciliation view — ordered vs. delivered vs. billed
          </p>
        </div>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Materials</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.onOrder}</div>
          <div className="text-xs text-slate-500 mt-0.5">On Order</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.delivered}</div>
          <div className="text-xs text-slate-500 mt-0.5">Delivered / Installed</div>
        </div>
        <div className={`border rounded-2xl p-4 ${stats.mismatches > 0 ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.mismatches}</div>
          <div className="text-xs text-slate-500 mt-0.5">Spec Mismatches</div>
        </div>
        <div className={`border rounded-2xl p-4 ${stats.valueAtRisk > 0 ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className={`text-xl font-bold tabular-nums ${stats.valueAtRisk > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {formatCurrencyShort(stats.valueAtRisk)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">₹ Value at Risk</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, spec, or supplier…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
          <option value="ALL">All Projects</option>
          {(projects as any[]).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 bg-white border border-slate-200 rounded-2xl text-center">
          <Package className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No materials found</p>
          <p className="text-slate-400 text-sm mt-1">Materials are extracted automatically from BOQ documents</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Material</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Specification</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ordered</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivered</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Billed</th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide text-red-500">Value at Risk</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplier</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((m: any) => {
                const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.NOT_ORDERED;
                const ordered = parseFloat(m.quantityOrdered || 0);
                const delivered = parseFloat(m.quantityDelivered || 0);
                const billed = parseFloat(m.quantityBilled || 0);
                const shortfall = delivered < ordered;
                const overbilled = billed > delivered;

                return (
                  <tr key={m.id}
                    className={`hover:bg-slate-50 transition-colors ${m.status === 'MISMATCH' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{m.name}</div>
                      {m.poNumber && <div className="text-xs text-slate-400 mt-0.5">PO: {m.poNumber}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs">
                      <p className="truncate">{m.specification}</p>
                      {m.deliveredSpec && m.deliveredSpec !== m.specification && (
                        <p className="text-red-500 truncate mt-0.5">Delivered: {m.deliveredSpec}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{m.unit}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">{ordered}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono ${shortfall && ordered > 0 ? 'text-amber-600 font-semibold' : 'text-slate-700'}`}>
                        {delivered}
                      </span>
                      {shortfall && ordered > 0 && (
                        <TrendingDown className="w-3 h-3 text-amber-500 inline ml-1" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-mono ${overbilled ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                        {billed}
                      </span>
                      {overbilled && (
                        <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {m.status === 'MISMATCH' ? (
                        <span className="text-xs font-semibold text-red-700">
                          {formatCurrencyShort(Math.abs(billed - delivered) * parseFloat(m.ratePerUnit || 0))}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-sm">{m.supplierName || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {(materials as any[]).length} materials
          </div>
        </div>
      )}
    </div>
  );
}
