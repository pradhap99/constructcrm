'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Calendar, IndianRupee, FolderKanban,
  FileText, Package, Receipt, Zap, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, Building2, Loader2, ChevronRight,
  BarChart3, Users, Brain, GitBranch, Plus, X,
} from 'lucide-react';
import { formatCurrencyShort, humanize } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';

const TABS = [
  { key: 'overview',    label: 'Overview',      icon: BarChart3 },
  { key: 'documents',   label: 'Documents',     icon: FileText },
  { key: 'materials',   label: 'Materials',     icon: Package },
  { key: 'bills',       label: 'RA Bills',      icon: Receipt },
  { key: 'variations',  label: 'Variations',    icon: GitBranch },
  { key: 'packages',    label: 'Work Packages', icon: TrendingUp },
  { key: 'agents',      label: 'AI Activity',   icon: Brain },
];

const VO_STATUS_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600' },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  APPROVED:  { label: 'Approved',  color: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Rejected',  color: 'bg-red-100 text-red-700' },
};

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  AWARDED:     'bg-purple-100 text-purple-700',
  TENDER:      'bg-amber-100 text-amber-700',
  ON_HOLD:     'bg-slate-100 text-slate-600',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-700',
};

const MATERIAL_STATUS_COLORS: Record<string, string> = {
  NOT_ORDERED: 'bg-slate-100 text-slate-600',
  PO_RAISED:   'bg-blue-100 text-blue-700',
  DELIVERED:   'bg-green-100 text-green-700',
  INSTALLED:   'bg-emerald-100 text-emerald-700',
  ON_HOLD:     'bg-amber-100 text-amber-700',
  MISMATCH:    'bg-red-100 text-red-700',
};

const BILL_STATUS_COLORS: Record<string, string> = {
  DRAFT:               'bg-slate-100 text-slate-600',
  SUBMITTED:           'bg-blue-100 text-blue-700',
  UNDER_CERTIFICATION: 'bg-amber-100 text-amber-700',
  CERTIFIED:           'bg-purple-100 text-purple-700',
  PAID:                'bg-green-100 text-green-700',
  DISPUTED:            'bg-red-100 text-red-700',
};

const AGENT_STATUS_COLORS: Record<string, string> = {
  QUEUED:    'bg-slate-100 text-slate-600',
  RUNNING:   'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED:    'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProject(id),
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.getDocuments(id),
    enabled: !!id && activeTab === 'documents',
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials', id],
    queryFn: () => api.getMaterials(id),
    enabled: !!id && activeTab === 'materials',
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills', id],
    queryFn: () => api.getBills(id),
    enabled: !!id && activeTab === 'bills',
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['workPackages', id],
    queryFn: () => api.getWorkPackages(id),
    enabled: !!id && activeTab === 'packages',
  });

  const { data: agentJobs = [] } = useQuery({
    queryKey: ['agentJobs', id],
    queryFn: () => api.getAgentJobs(id),
    enabled: !!id && activeTab === 'agents',
    refetchInterval: 10000,
  });

  const { data: variations = [] } = useQuery({
    queryKey: ['variations', id],
    queryFn: () => api.getVariations(id),
    enabled: !!id && activeTab === 'variations',
  });

  const qc = useQueryClient();
  const [showVOModal, setShowVOModal] = useState(false);
  const [voForm, setVoForm] = useState({ description: '', estimatedValue: '', reason: '', status: 'DRAFT' });

  const createVOMutation = useMutation({
    mutationFn: api.createVariation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variations', id] });
      setShowVOModal(false);
      setVoForm({ description: '', estimatedValue: '', reason: '', status: 'DRAFT' });
      toast.success('Variation order created');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create variation'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-slate-500">Project not found.</p>
        <Link href="/projects" className="mt-3 text-blue-600 hover:underline text-sm">← Back to projects</Link>
      </div>
    );
  }

  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const progress = Math.min(100, Math.max(0, Math.round((Date.now() - start) / (end - start) * 100)));

  // Summary stats from related data
  const mismatchCount = (materials as any[]).filter((m: any) => m.status === 'MISMATCH').length;
  const pendingBills = (bills as any[]).filter((b: any) => ['SUBMITTED', 'UNDER_CERTIFICATION'].includes(b.status));
  const totalCertified = (bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.certifiedAmount || 0), 0);

  return (
    <div className="min-h-full bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <button onClick={() => router.push('/projects')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-600'}`}>
                {project.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="font-medium text-slate-600">{project.code}</span>
              {project.client && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> {project.client.name}
                  </span>
                </>
              )}
              {project.siteAddress && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {project.siteAddress}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(project.contractValue)}</div>
            <div className="text-xs text-slate-400 mt-0.5">Contract Value</div>
          </div>
        </div>

        {/* Timeline bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(project.startDate)}</span>
            <span className="font-medium text-slate-600">{progress}% of timeline elapsed</span>
            <span>{formatDate(project.endDate)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 border-b border-transparent -mb-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-8">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
              {[
                { label: 'Documents', value: project._count?.documents ?? '—', icon: FileText, color: 'blue', action: () => setActiveTab('documents') },
                { label: 'Materials', value: project._count?.materials ?? '—', icon: Package, color: 'purple', action: () => setActiveTab('materials') },
                { label: 'RA Bills', value: project._count?.runningBills ?? '—', icon: Receipt, color: 'green', action: () => setActiveTab('bills') },
                { label: 'Mismatches', value: mismatchCount, icon: AlertTriangle, color: mismatchCount > 0 ? 'red' : 'slate', action: () => setActiveTab('materials') },
              ].map(card => (
                <button key={card.label} onClick={card.action}
                  className={`bg-white border rounded-2xl p-5 text-left hover:shadow-md transition-all group ${
                    card.color === 'red' && mismatchCount > 0 ? 'border-red-200' : 'border-slate-200 hover:border-blue-200'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${card.color}-50`}>
                      <card.icon className={`w-5 h-5 text-${card.color}-600`} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{card.label}</div>
                </button>
              ))}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Project Details</h3>
                <dl className="space-y-3">
                  {[
                    { label: 'Phase', value: project.phase?.replace(/_/g, ' ') },
                    { label: 'Currency', value: project.currency },
                    { label: 'Contract Value', value: formatCurrency(project.contractValue) },
                    { label: 'Total Certified', value: formatCurrency(totalCertified) },
                    { label: 'Description', value: project.description || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <dt className="text-sm text-slate-500 w-36 shrink-0">{label}</dt>
                      <dd className="text-sm font-medium text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Pending Actions</h3>
                {pendingBills.length === 0 && mismatchCount === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                    <p className="text-slate-500 text-sm">All clear — no pending actions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mismatchCount > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-800">{mismatchCount} material spec mismatch{mismatchCount > 1 ? 'es' : ''} detected</p>
                          <p className="text-xs text-red-600">Review materials for spec deviations</p>
                        </div>
                        <button onClick={() => setActiveTab('materials')} className="text-xs text-red-600 hover:underline shrink-0">Review</button>
                      </div>
                    )}
                    {pendingBills.map((b: any) => (
                      <div key={b.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-amber-800">{b.billNumber} — {b.status.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-amber-600">{formatCurrency(b.netAmount)} awaiting certification</p>
                        </div>
                        <button onClick={() => setActiveTab('bills')} className="text-xs text-amber-600 hover:underline shrink-0">View</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">Documents</h2>
              <Link href="/documents" className="text-sm text-blue-600 hover:underline">Upload new →</Link>
            </div>
            {(documents as any[]).length === 0 ? (
              <EmptyState icon={FileText} title="No documents yet" subtitle="Upload a BOQ or measurement book from the Documents page." />
            ) : (
              <div className="space-y-3">
                {(documents as any[]).map((doc: any) => (
                  <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                      <p className="text-xs text-slate-400">{doc.type} · {timeAgo(doc.createdAt)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      doc.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      doc.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{doc.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MATERIALS ── */}
        {activeTab === 'materials' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">Materials</h2>
              <Link href="/materials" className="text-sm text-blue-600 hover:underline">View all materials →</Link>
            </div>
            {(materials as any[]).length === 0 ? (
              <EmptyState icon={Package} title="No materials tracked" subtitle="Materials are added automatically when the AI processes your BOQ documents." />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Material', 'Spec', 'Unit', 'Ordered', 'Delivered', 'Billed', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(materials as any[]).map((m: any) => (
                      <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${m.status === 'MISMATCH' ? 'bg-red-50/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate text-xs">{m.specification}</td>
                        <td className="px-4 py-3 text-slate-500">{m.unit}</td>
                        <td className="px-4 py-3 text-slate-700 font-mono">{m.quantityOrdered}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className={parseFloat(m.quantityDelivered) < parseFloat(m.quantityOrdered) ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                            {m.quantityDelivered}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-mono">{m.quantityBilled}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MATERIAL_STATUS_COLORS[m.status] || 'bg-slate-100 text-slate-600'}`}>
                            {m.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── BILLS ── */}
        {activeTab === 'bills' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">Running Account Bills</h2>
              <Link href="/bills" className="text-sm text-blue-600 hover:underline">View all bills →</Link>
            </div>
            {(bills as any[]).length === 0 ? (
              <EmptyState icon={Receipt} title="No bills raised yet" subtitle="Create an RA bill from the Bills page to track payments for this project." />
            ) : (
              <div className="space-y-3">
                {(bills as any[]).map((b: any) => (
                  <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">{b.billNumber}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${BILL_STATUS_COLORS[b.status] || 'bg-slate-100 text-slate-600'}`}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(b.netAmount)}</span>
                    </div>
                    <div className="flex gap-6 text-xs text-slate-500">
                      <span>Gross: {formatCurrency(b.grossAmount)}</span>
                      <span>Deductions: {formatCurrency(b.deductions)}</span>
                      {b.certifiedAmount && <span className="text-green-600 font-medium">Certified: {formatCurrency(b.certifiedAmount)}</span>}
                      {b.paidAmount > 0 && <span className="text-blue-600 font-medium">Paid: {formatCurrency(b.paidAmount)}</span>}
                      <span>{formatDate(b.billDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VARIATION ORDERS ── */}
        {activeTab === 'variations' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">Variation / Change Orders</h2>
              <button
                onClick={() => setShowVOModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> New VO
              </button>
            </div>

            {(variations as any[]).length === 0 ? (
              <EmptyState icon={GitBranch} title="No variation orders" subtitle="Variation orders track scope changes, additional works, and price adjustments beyond the original contract." />
            ) : (
              <div className="space-y-3">
                {(variations as any[]).map((vo: any, idx: number) => {
                  const cfg = VO_STATUS_CFG[vo.status] || VO_STATUS_CFG.DRAFT;
                  const daysPending = vo.createdAt ? Math.floor((Date.now() - new Date(vo.createdAt).getTime()) / 86_400_000) : 0;
                  return (
                    <div key={vo.id} className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-semibold text-slate-500">VO-{String(idx + 1).padStart(3, '0')}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                            {vo.status === 'SUBMITTED' && (
                              <span className="text-xs text-amber-600">{daysPending}d in review</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-800 line-clamp-2">{vo.description}</p>
                          {vo.reason && <p className="text-xs text-slate-400 mt-1">Reason: {vo.reason}</p>}
                        </div>
                        {vo.estimatedValue && (
                          <span className="text-base font-bold text-slate-900 tabular-nums shrink-0">
                            {formatCurrencyShort(vo.estimatedValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VO Modal */}
            {showVOModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">New Variation Order</h2>
                    <button onClick={() => setShowVOModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Description *</label>
                      <textarea
                        value={voForm.description}
                        onChange={e => setVoForm(f => ({ ...f, description: e.target.value }))}
                        rows={2}
                        placeholder="Scope: Add 2 extra culverts on Ch. 42+500"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Estimated Value (₹)</label>
                        <input
                          type="number"
                          value={voForm.estimatedValue}
                          onChange={e => setVoForm(f => ({ ...f, estimatedValue: e.target.value }))}
                          placeholder="3850000"
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
                        <select
                          value={voForm.status}
                          onChange={e => setVoForm(f => ({ ...f, status: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SUBMITTED">Submitted</option>
                          <option value="APPROVED">Approved</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Reason for Change</label>
                      <input
                        value={voForm.reason}
                        onChange={e => setVoForm(f => ({ ...f, reason: e.target.value }))}
                        placeholder="Design change, site condition, client request…"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 p-6 border-t border-slate-100">
                    <button onClick={() => setShowVOModal(false)}
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
                      Cancel
                    </button>
                    <button
                      disabled={createVOMutation.isPending || !voForm.description}
                      onClick={() => createVOMutation.mutate({
                        projectId: id,
                        ...voForm,
                        estimatedValue: voForm.estimatedValue ? parseFloat(voForm.estimatedValue) : undefined,
                      })}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {createVOMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create VO
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WORK PACKAGES ── */}
        {activeTab === 'packages' && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-5">Work Packages</h2>
            {(workPackages as any[]).length === 0 ? (
              <EmptyState icon={TrendingUp} title="No work packages yet" subtitle="Work packages define the scope breakdown for this project." />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Package', 'Code', 'Zone/Level', 'Unit', 'Qty', 'Rate', 'Amount', 'Progress'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(workPackages as any[]).map((wp: any) => {
                      const pct = wp.quantity > 0 ? Math.round((wp.completedQty / wp.quantity) * 100) : 0;
                      return (
                        <tr key={wp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{wp.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{wp.code}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{[wp.zone, wp.level].filter(Boolean).join(' / ') || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{wp.unit}</td>
                          <td className="px-4 py-3 font-mono text-slate-700">{wp.quantity}</td>
                          <td className="px-4 py-3 font-mono text-slate-700">{formatCurrency(wp.rate)}</td>
                          <td className="px-4 py-3 font-mono text-slate-700">{formatCurrency(parseFloat(wp.quantity) * parseFloat(wp.rate))}</td>
                          <td className="px-4 py-3 w-32">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct > 90 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-500 shrink-0">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── AI ACTIVITY ── */}
        {activeTab === 'agents' && (
          <div>
            <h2 className="font-semibold text-slate-900 mb-5">AI Agent Activity</h2>
            {(agentJobs as any[]).length === 0 ? (
              <EmptyState icon={Brain} title="No AI jobs yet" subtitle="Agent runs appear here as documents are processed and analysed." />
            ) : (
              <div className="space-y-3">
                {(agentJobs as any[]).map((job: any) => (
                  <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                          <Brain className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{job.agentType.replace(/_/g, ' ')} Agent</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AGENT_STATUS_COLORS[job.status] || 'bg-slate-100 text-slate-600'}`}>
                              {job.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{timeAgo(job.createdAt)}{job.durationMs && ` · ${(job.durationMs / 1000).toFixed(1)}s`}</p>
                        </div>
                      </div>
                      {job.status === 'RUNNING' && <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />}
                    </div>
                    {job.errorMessage && (
                      <p className="mt-2 ml-11 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">{job.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-56 text-center bg-white border border-slate-200 rounded-2xl">
      <Icon className="w-10 h-10 text-slate-200 mb-3" />
      <p className="text-slate-600 font-medium text-sm">{title}</p>
      <p className="text-slate-400 text-xs mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}
