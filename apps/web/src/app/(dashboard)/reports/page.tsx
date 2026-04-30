'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrencyShort, formatDate, daysAgo, agingColor } from '@/lib/utils';
import { BarChart3, Download, AlertTriangle } from 'lucide-react';

type Tab = 'cashflow' | 'pnl' | 'materials';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('cashflow');

  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => api.getBills() });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: () => api.getMaterials() });

  // Cash flow aging buckets
  const pendingBills = (bills as any[]).filter((b: any) => ['SUBMITTED', 'UNDER_CERTIFICATION', 'CERTIFIED'].includes(b.status));

  const aging = {
    '0-30':  pendingBills.filter((b: any) => daysAgo(b.submittedDate || b.billDate || b.createdAt) <= 30),
    '31-60': pendingBills.filter((b: any) => { const d = daysAgo(b.submittedDate || b.billDate || b.createdAt); return d > 30 && d <= 60; }),
    '61-90': pendingBills.filter((b: any) => { const d = daysAgo(b.submittedDate || b.billDate || b.createdAt); return d > 60 && d <= 90; }),
    '90+':   pendingBills.filter((b: any) => daysAgo(b.submittedDate || b.billDate || b.createdAt) > 90),
  };

  const agingTotal = pendingBills.reduce((s: number, b: any) => s + parseFloat(b.netAmount || 0), 0);

  const maxBucket = Math.max(
    ...Object.values(aging).map(arr => arr.reduce((s: number, b: any) => s + parseFloat(b.netAmount || 0), 0))
  ) || 1;

  const downloadCSV = (data: string, filename: string) => {
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCashFlow = () => {
    const rows = ['Bill Number,Project,Status,Submitted Date,Age (days),Net Amount'];
    pendingBills.forEach((b: any) => {
      rows.push([
        b.billNumber,
        b.project?.name || '',
        b.status,
        b.submittedDate || b.billDate || '',
        daysAgo(b.submittedDate || b.billDate || b.createdAt),
        b.netAmount,
      ].join(','));
    });
    downloadCSV(rows.join('\n'), 'civiliq-cashflow.csv');
  };

  const exportPnL = () => {
    const rows = ['Project,Contract Value,Total Billed,Certified,Paid,Outstanding'];
    (projects as any[]).forEach((p: any) => {
      const pb = (bills as any[]).filter((b: any) => b.projectId === p.id);
      const billed = pb.reduce((s: number, b: any) => s + parseFloat(b.grossAmount || 0), 0);
      const certified = pb.reduce((s: number, b: any) => s + parseFloat(b.certifiedAmount || 0), 0);
      const paid = pb.reduce((s: number, b: any) => s + parseFloat(b.paidAmount || 0), 0);
      rows.push([p.name, p.contractValue, billed, certified, paid, certified - paid].join(','));
    });
    downloadCSV(rows.join('\n'), 'civiliq-pnl.csv');
  };

  const TABS = [
    { key: 'cashflow', label: 'Cash Flow Aging' },
    { key: 'pnl',      label: 'Project P&L' },
    { key: 'materials', label: 'Materials' },
  ] as const;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" /> Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">Financial summaries across your portfolio</p>
        </div>
        <button
          onClick={tab === 'cashflow' ? exportCashFlow : exportPnL}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cash Flow Aging */}
      {tab === 'cashflow' && (
        <div className="space-y-5">
          {/* Aging bars */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-5">Receivables Aging</h2>
            <div className="space-y-4">
              {(Object.entries(aging) as [string, any[]][]).map(([bucket, bs]) => {
                const value = bs.reduce((s: number, b: any) => s + parseFloat(b.netAmount || 0), 0);
                const pct = maxBucket > 0 ? (value / maxBucket) * 100 : 0;
                const isOverdue = bucket === '61-90' || bucket === '90+';
                return (
                  <div key={bucket} className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 w-20 shrink-0">{bucket} days</span>
                    <div className="flex-1 h-7 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 relative">
                      <div
                        className={`h-full rounded-lg transition-all ${isOverdue ? 'bg-red-400' : bucket === '31-60' ? 'bg-amber-400' : 'bg-blue-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                      {value > 0 && (
                        <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-white mix-blend-multiply">
                          {formatCurrencyShort(value)}
                        </span>
                      )}
                    </div>
                    <div className="text-right w-24 shrink-0">
                      <span className={`text-sm font-semibold tabular-nums ${isOverdue && value > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                        {formatCurrencyShort(value)}
                      </span>
                      {bs.length > 0 && (
                        <div className="text-xs text-slate-400">{bs.length} bill{bs.length > 1 ? 's' : ''}</div>
                      )}
                    </div>
                    {isOverdue && value > 0 && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between">
              <span className="text-sm text-slate-500">Total Receivable</span>
              <span className="text-base font-bold text-slate-900 tabular-nums">{formatCurrencyShort(agingTotal)}</span>
            </div>
          </div>

          {/* Bill detail table */}
          {pendingBills.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Outstanding Bills Detail</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Bill No.</th>
                      <th className="px-5 py-3 text-left">Project</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-center">Age</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pendingBills
                      .sort((a: any, b: any) =>
                        daysAgo(b.submittedDate || b.billDate || b.createdAt) -
                        daysAgo(a.submittedDate || a.billDate || a.createdAt)
                      )
                      .map((b: any) => {
                        const days = daysAgo(b.submittedDate || b.billDate || b.createdAt);
                        return (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-medium">{b.billNumber}</td>
                            <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{b.project?.name}</td>
                            <td className="px-5 py-3 text-slate-500">{b.status.replace(/_/g, ' ')}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full ${agingColor(days)}`}>{days}d</span>
                            </td>
                            <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatCurrencyShort(b.netAmount)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project P&L */}
      {tab === 'pnl' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Project Financials</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Project</th>
                  <th className="px-5 py-3 text-right">Contract</th>
                  <th className="px-5 py-3 text-right">Billed</th>
                  <th className="px-5 py-3 text-right">Certified</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                  <th className="px-5 py-3 text-right">% Billed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(projects as any[]).map((p: any) => {
                  const pb = (bills as any[]).filter((b: any) => b.projectId === p.id);
                  const billed = pb.reduce((s: number, b: any) => s + parseFloat(b.grossAmount || 0), 0);
                  const certified = pb.reduce((s: number, b: any) => s + parseFloat(b.certifiedAmount || 0), 0);
                  const paid = pb.reduce((s: number, b: any) => s + parseFloat(b.paidAmount || 0), 0);
                  const outstanding = certified - paid;
                  const billedPct = p.contractValue > 0 ? Math.round(billed / parseFloat(p.contractValue) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 line-clamp-1">{p.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{p.status.replace('_', ' ')}</div>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-700 font-medium">{formatCurrencyShort(p.contractValue)}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-slate-600">{billed > 0 ? formatCurrencyShort(billed) : '—'}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-purple-700">{certified > 0 ? formatCurrencyShort(certified) : '—'}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-green-700">{paid > 0 ? formatCurrencyShort(paid) : '—'}</td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        <span className={outstanding > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'}>
                          {outstanding > 0 ? formatCurrencyShort(outstanding) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          billedPct > 90 ? 'bg-green-100 text-green-700' :
                          billedPct > 50 ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>{billedPct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="text-sm font-semibold text-slate-700">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatCurrencyShort((projects as any[]).reduce((s: number, p: any) => s + parseFloat(p.contractValue || 0), 0))}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {formatCurrencyShort((bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.grossAmount || 0), 0))}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-purple-700">
                    {formatCurrencyShort((bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.certifiedAmount || 0), 0))}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-green-700">
                    {formatCurrencyShort((bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.paidAmount || 0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Materials summary */}
      {tab === 'materials' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Materials at Risk</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Material</th>
                  <th className="px-5 py-3 text-left">Project</th>
                  <th className="px-5 py-3 text-left">Spec Ordered</th>
                  <th className="px-5 py-3 text-left">Spec Delivered</th>
                  <th className="px-5 py-3 text-right">Value at Risk</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(materials as any[])
                  .filter((m: any) => m.status === 'MISMATCH')
                  .map((m: any) => {
                    const diff = Math.abs(parseFloat(m.quantityBilled || 0) - parseFloat(m.quantityDelivered || 0));
                    const risk = diff * parseFloat(m.ratePerUnit || 0);
                    return (
                      <tr key={m.id} className="bg-red-50/30 hover:bg-red-50">
                        <td className="px-5 py-3 font-medium text-slate-800">{m.name}</td>
                        <td className="px-5 py-3 text-slate-500">{m.project?.name || '—'}</td>
                        <td className="px-5 py-3 text-xs text-slate-500 max-w-xs truncate">{m.specification || '—'}</td>
                        <td className="px-5 py-3 text-xs text-red-600 max-w-xs truncate">{m.deliveredSpec || '—'}</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-red-700">{formatCurrencyShort(risk)}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Mismatch</span>
                        </td>
                      </tr>
                    );
                  })}
                {(materials as any[]).filter((m: any) => m.status === 'MISMATCH').length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      No material mismatches detected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
