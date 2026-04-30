'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatCurrencyShort, daysAgo, agingColor } from '@/lib/utils';
import {
  Receipt, Plus, Search, Loader2, X, IndianRupee,
  CheckCircle2, Clock, AlertCircle, FileText, AlertTriangle,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  DRAFT:               { label: 'Draft',               color: 'bg-slate-100 text-slate-600',    step: 0 },
  SUBMITTED:           { label: 'Submitted',           color: 'bg-blue-100 text-blue-700',      step: 1 },
  UNDER_CERTIFICATION: { label: 'Under Certification', color: 'bg-amber-100 text-amber-700',    step: 2 },
  CERTIFIED:           { label: 'Certified',           color: 'bg-purple-100 text-purple-700',  step: 3 },
  PAID:                { label: 'Paid',                color: 'bg-green-100 text-green-700',    step: 4 },
  DISPUTED:            { label: 'Disputed',            color: 'bg-red-100 text-red-700',        step: -1 },
};

const PIPELINE_STEPS = ['Draft', 'Submitted', 'Under Certification', 'Certified', 'Paid'];

export default function BillsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    projectId: '', billNumber: '', billDate: '', grossAmount: '', deductions: '', notes: '',
  });

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => api.getBills(),
  });

  const createMutation = useMutation({
    mutationFn: api.createBill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      setShowModal(false);
      toast.success('RA Bill created');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create bill'),
  });

  const filtered = (bills as any[]).filter((b: any) => {
    const matchSearch = b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      (b.project?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchProject = projectFilter === 'ALL' || b.projectId === projectFilter;
    return matchSearch && matchProject;
  });

  const stats = {
    total: (bills as any[]).length,
    totalGross: (bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.grossAmount || 0), 0),
    totalCertified: (bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.certifiedAmount || 0), 0),
    totalPaid: (bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.paidAmount || 0), 0),
    pending: (bills as any[]).filter((b: any) => ['SUBMITTED', 'UNDER_CERTIFICATION'].includes(b.status)).length,
  };

  const pendingBills = (bills as any[]).filter((b: any) =>
    ['SUBMITTED', 'UNDER_CERTIFICATION'].includes(b.status)
  );

  const netAmount = parseFloat(form.grossAmount || '0') - parseFloat(form.deductions || '0');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Running Account Bills</h1>
          <p className="text-slate-500 text-sm mt-1">{stats.pending} pending certification · {stats.total} total</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Bill
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Billed', value: formatCurrency(stats.totalGross), icon: Receipt, color: 'blue' },
          { label: 'Certified', value: formatCurrency(stats.totalCertified), icon: CheckCircle2, color: 'purple' },
          { label: 'Paid', value: formatCurrency(stats.totalPaid), icon: IndianRupee, color: 'green' },
          { label: 'Outstanding', value: formatCurrency(stats.totalCertified - stats.totalPaid), icon: Clock, color: 'amber' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-lg bg-${kpi.color}-50 flex items-center justify-center mb-2`}>
              <kpi.icon className={`w-4 h-4 text-${kpi.color}-600`} />
            </div>
            <div className="text-xl font-bold text-slate-900 truncate">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search bills…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
        </div>
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
          <option value="ALL">All Projects</option>
          {(projects as any[]).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Aging Tracker */}
      {pendingBills.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6 shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">Outstanding Bills — Aging Tracker</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-5 py-2.5 text-left">Bill</th>
                  <th className="px-5 py-2.5 text-left">Project</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                  <th className="px-5 py-2.5 text-center">Age</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pendingBills
                  .sort((a: any, b: any) => daysAgo(a.submittedDate || a.billDate) - daysAgo(b.submittedDate || b.billDate))
                  .reverse()
                  .map((b: any) => {
                    const days = daysAgo(b.submittedDate || b.billDate || b.createdAt);
                    const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-800">{b.billNumber}</td>
                        <td className="px-5 py-3 text-slate-500 max-w-xs">
                          <span className="truncate block">{b.project?.name || '—'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${agingColor(days)}`}>
                            {days}d{days > 60 ? ' ⚠ OVERDUE' : ''}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800">
                          {formatCurrencyShort(b.netAmount)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bills */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 bg-white border border-slate-200 rounded-2xl text-center">
          <Receipt className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No bills raised yet</p>
          <p className="text-slate-400 text-sm mt-1">Create an RA bill to start tracking payments</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            New Bill
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b: any) => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.DRAFT;
            const step = cfg.step;
            const outstanding = parseFloat(b.certifiedAmount || 0) - parseFloat(b.paidAmount || 0);

            return (
              <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900 text-base">{b.billNumber}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {b.project?.name || '—'} · {formatDate(b.billDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900">{formatCurrency(b.netAmount)}</div>
                    <div className="text-xs text-slate-400">Net Amount</div>
                  </div>
                </div>

                {/* Pipeline stepper */}
                {b.status !== 'DISPUTED' && (
                  <div className="flex items-center gap-0 mb-4">
                    {PIPELINE_STEPS.map((label, i) => {
                      const isComplete = step > i;
                      const isCurrent = step === i;
                      return (
                        <div key={label} className="flex items-center flex-1">
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                            isComplete ? 'text-green-700' :
                            isCurrent ? 'text-blue-700' :
                            'text-slate-400'
                          }`}>
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : isCurrent ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-blue-100" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                            )}
                            {label}
                          </div>
                          {i < PIPELINE_STEPS.length - 1 && (
                            <div className={`flex-1 h-px mx-1 ${isComplete ? 'bg-green-300' : 'bg-slate-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Amounts row */}
                <div className="grid grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                  {[
                    { label: 'Gross', value: formatCurrency(b.grossAmount) },
                    { label: 'Deductions', value: formatCurrency(b.deductions || 0) },
                    { label: 'Certified', value: b.certifiedAmount ? formatCurrency(b.certifiedAmount) : '—' },
                    { label: outstanding > 0 ? 'Outstanding' : 'Paid', value: outstanding > 0 ? formatCurrency(outstanding) : formatCurrency(b.paidAmount) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                      <div className="text-sm font-semibold text-slate-800">{value}</div>
                    </div>
                  ))}
                </div>

                {b.notes && (
                  <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{b.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">New RA Bill</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Project *</label>
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select project…</option>
                  {(projects as any[]).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Bill Number *</label>
                  <input value={form.billNumber} onChange={e => setForm(f => ({ ...f, billNumber: e.target.value }))}
                    placeholder="RA-001"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Bill Date *</label>
                  <input type="date" value={form.billDate} onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Gross Amount (₹) *</label>
                  <input type="number" value={form.grossAmount} onChange={e => setForm(f => ({ ...f, grossAmount: e.target.value }))}
                    placeholder="5000000"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Deductions (₹)</label>
                  <input type="number" value={form.deductions} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {form.grossAmount && (
                <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm">
                  <span className="text-slate-500">Net Amount: </span>
                  <span className="font-semibold text-blue-700">{formatCurrency(netAmount)}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="e.g. RCC works for Block A, Ground to 3rd floor"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                disabled={createMutation.isPending || !form.projectId || !form.billNumber || !form.billDate || !form.grossAmount}
                onClick={() => createMutation.mutate({
                  ...form,
                  grossAmount: parseFloat(form.grossAmount),
                  deductions: parseFloat(form.deductions || '0'),
                  netAmount,
                })}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
