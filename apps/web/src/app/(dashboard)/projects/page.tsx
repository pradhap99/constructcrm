'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import {
  Plus, Search, FolderKanban, MapPin, Calendar,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Building2, Loader2, X, FileText, Package,
} from 'lucide-react';
import { formatCurrencyShort, humanize } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  AWARDED:     { label: 'Awarded',     color: 'bg-purple-100 text-purple-700' },
  TENDER:      { label: 'Tender',      color: 'bg-amber-100 text-amber-700' },
  ON_HOLD:     { label: 'On Hold',     color: 'bg-slate-100 text-slate-600' },
  COMPLETED:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-100 text-red-700' },
};

const PHASE_ICONS: Record<string, any> = {
  EXECUTION: TrendingUp, PLANNING: Clock, MOBILISATION: Building2,
  TESTING_COMMISSIONING: CheckCircle2, DEFECTS_LIABILITY: AlertTriangle, CLOSED: CheckCircle2,
};

export default function ProjectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', code: '', contractValue: '',
    startDate: '', endDate: '', siteAddress: '',
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  const createMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowModal(false);
      toast.success('Project created successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create project'),
  });

  const filtered = (projects as any[]).filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: (projects as any[]).length,
    active: (projects as any[]).filter((p: any) => p.status === 'IN_PROGRESS').length,
    totalValue: (projects as any[]).reduce((s: number, p: any) => s + parseFloat(p.contractValue || 0), 0),
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.active} active · {stats.total} total · {formatCurrency(stats.totalValue)} portfolio
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects by name or code…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderKanban className="w-12 h-12 text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first project to get started</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project: any) => {
            const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.IN_PROGRESS;
            const PhaseIcon = PHASE_ICONS[project.phase] || TrendingUp;
            const start = new Date(project.startDate).getTime();
            const end = new Date(project.endDate).getTime();
            const progress = Math.min(100, Math.max(0, Math.round((Date.now() - start) / (end - start) * 100)));

            const borderColor =
              project.status === 'IN_PROGRESS' ? 'border-l-blue-500' :
              project.status === 'AWARDED'     ? 'border-l-purple-500' :
              project.status === 'COMPLETED'   ? 'border-l-green-500' :
              project.status === 'ON_HOLD'     ? 'border-l-amber-400' :
              project.status === 'CANCELLED'   ? 'border-l-red-400' :
              'border-l-slate-300';

            return (
              <div key={project.id} onClick={() => router.push(`/projects/${project.id}`)}
                className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${borderColor} p-5 hover:shadow-md transition-all cursor-pointer group`}>
                {/* Status + value */}
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {formatCurrencyShort(project.contractValue)}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1" title={project.name}>
                  {project.name}
                </h3>

                {project.siteAddress && (
                  <p className="text-xs text-slate-400 mb-3 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {project.siteAddress.split(',').slice(-2).join(',').trim()}
                  </p>
                )}

                {/* Progress bars */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-14 shrink-0">Timeline</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progress > 90 ? 'bg-red-500' : progress > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-7 text-right tabular-nums">{progress}%</span>
                  </div>
                </div>

                {/* Bottom stats */}
                <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-50 pt-3">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />{project._count?.documents ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />{project._count?.materials ?? 0}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{formatDate(project.endDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">New Project</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Project Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="NH-48 Road Widening Phase 2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Project Code *</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PRJ-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Contract Value (₹) *</label>
                  <input type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50000000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Start Date *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">End Date *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Address</label>
                  <input value={form.siteAddress} onChange={e => setForm(f => ({ ...f, siteAddress: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="NH-48, Bengaluru – Tumakuru corridor, Karnataka" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                disabled={createMutation.isPending || !form.name || !form.code || !form.contractValue}
                onClick={() => createMutation.mutate({ ...form, contractValue: parseFloat(form.contractValue) })}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
