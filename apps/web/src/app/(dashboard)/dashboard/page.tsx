'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { formatCurrencyShort, formatDate, timeAgo, humanize, daysAgo } from '@/lib/utils';
import {
  FolderKanban, FileText, Zap, AlertTriangle, ArrowRight,
  TrendingUp, Receipt, CheckCircle2, Clock, Bot,
} from 'lucide-react';
import Link from 'next/link';
import { SkeletonKPI } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: projects = [], isLoading: projLoading } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: () => api.getDocuments() });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => api.getBills() });
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications });
  const { data: agentJobs = [] } = useQuery({ queryKey: ['agent-jobs'], queryFn: () => api.getAgentJobs() });

  const activeProjects = (projects as any[]).filter((p: any) => p.status === 'IN_PROGRESS');
  const totalValue = (projects as any[]).reduce((s: number, p: any) => s + parseFloat(p.contractValue || 0), 0);
  const processingDocs = (documents as any[]).filter((d: any) => ['QUEUED', 'PROCESSING', 'EXTRACTED', 'MAPPED'].includes(d.status));

  const pendingBills = (bills as any[]).filter((b: any) => ['SUBMITTED', 'UNDER_CERTIFICATION'].includes(b.status));
  const pendingValue = pendingBills.reduce((s: number, b: any) => s + parseFloat(b.netAmount || 0), 0);

  const totalBilled = (bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.grossAmount || 0), 0);
  const totalCertified = (bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.certifiedAmount || 0), 0);
  const totalPaid = (bills as any[]).reduce((s: number, b: any) => s + parseFloat(b.paidAmount || 0), 0);

  const criticalNotifs = (notifications as any[]).filter((n: any) => !n.seenAt && n.severity === 'CRITICAL');
  const warningNotifs = (notifications as any[]).filter((n: any) => !n.seenAt && n.severity === 'WARNING');
  const alertNotifs = [...criticalNotifs, ...warningNotifs].slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const recentJobs = (agentJobs as any[]).slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alert banners — only when there are unread critical/warning */}
      {alertNotifs.length > 0 && (
        <div className="space-y-2 mb-6">
          {alertNotifs.map((n: any) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                n.severity === 'CRITICAL'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${n.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${n.severity === 'CRITICAL' ? 'text-red-800' : 'text-amber-800'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className={`text-xs mt-0.5 ${n.severity === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>
                    {n.body}
                  </p>
                )}
              </div>
              <span className={`text-xs shrink-0 ${n.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-500'}`}>
                {timeAgo(n.createdAt)}
              </span>
            </div>
          ))}
          {(criticalNotifs.length + warningNotifs.length) > 3 && (
            <p className="text-xs text-slate-500 pl-1">
              +{(criticalNotifs.length + warningNotifs.length) - 3} more alerts —{' '}
              <button className="text-blue-600 hover:underline">view all</button>
            </p>
          )}
        </div>
      )}

      {/* KPI Cards — differentiated visual weight */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {projLoading ? (
          Array(4).fill(0).map((_, i) => <SkeletonKPI key={i} />)
        ) : (
          <>
            {/* Hero: Portfolio Value */}
            <Link href="/projects"
              className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white hover:shadow-lg hover:shadow-blue-900/30 transition-all group col-span-2 xl:col-span-1">
              <div className="flex items-start justify-between mb-2">
                <TrendingUp className="w-5 h-5 opacity-70" />
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
              <div className="text-3xl font-bold tabular-nums leading-tight">{formatCurrencyShort(totalValue)}</div>
              <div className="text-sm opacity-70 mt-1">Portfolio Value</div>
              <div className="text-xs opacity-50 mt-0.5">{activeProjects.length} active · {(projects as any[]).length} total</div>
            </Link>

            {/* Pending Certification — warning style if has pending */}
            <Link href="/bills"
              className={`rounded-2xl p-5 border hover:shadow-md transition-all group ${pendingValue > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${pendingValue > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  <Receipt className={`w-4 h-4 ${pendingValue > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className={`text-2xl font-bold tabular-nums ${pendingValue > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {formatCurrencyShort(pendingValue)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Pending Certification</div>
              <div className="text-xs text-slate-400 mt-0.5">{pendingBills.length} bills awaiting</div>
            </Link>

            {/* Processing now */}
            <Link href="/documents"
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-600" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{processingDocs.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">AI Processing</div>
              <div className="text-xs text-slate-400 mt-0.5">docs in pipeline</div>
            </Link>

            {/* Total documents */}
            <Link href="/documents"
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{(documents as any[]).length}</div>
              <div className="text-xs text-slate-500 mt-0.5">Documents</div>
              <div className="text-xs text-slate-400 mt-0.5">{(documents as any[]).filter((d: any) => d.status === 'COMPLETED').length} processed</div>
            </Link>
          </>
        )}
      </div>

      {/* Two-column: Project health + Cash flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Project Health */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Project Health</h2>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(projects as any[]).length === 0 ? (
              <div className="px-5 py-10 text-center">
                <FolderKanban className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No projects yet</p>
              </div>
            ) : (
              (projects as any[]).slice(0, 5).map((p: any) => {
                const start = new Date(p.startDate).getTime();
                const end = new Date(p.endDate).getTime();
                const pct = Math.min(100, Math.max(0, Math.round((Date.now() - start) / (end - start) * 100)));
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm font-medium text-slate-800 truncate">{p.name}</span>
                        {pct > 90 && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-14 shrink-0">Timeline</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right shrink-0">{pct}%</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 tabular-nums shrink-0">
                      {formatCurrencyShort(p.contractValue)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Receivables Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Receivables Summary</h2>
            <Link href="/bills" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
              RA Bills <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 py-2">
            {[
              { label: 'Total Billed',   value: totalBilled,               color: 'text-slate-900' },
              { label: 'Certified',      value: totalCertified,            color: 'text-purple-700' },
              { label: 'Paid',           value: totalPaid,                 color: 'text-green-700' },
              { label: 'Outstanding',    value: totalCertified - totalPaid, color: totalCertified - totalPaid > 0 ? 'text-amber-700' : 'text-slate-400' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className={`text-sm font-semibold tabular-nums ${row.color}`}>{formatCurrencyShort(row.value)}</span>
              </div>
            ))}
          </div>

          {/* Pending bills breakdown */}
          {pendingBills.length > 0 && (
            <div className="px-5 pb-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700">
                    {pendingBills.length} bill{pendingBills.length > 1 ? 's' : ''} pending
                  </span>
                </div>
                {pendingBills.slice(0, 2).map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between text-xs text-amber-600 mt-0.5">
                    <span>{b.billNumber} · {b.project?.name}</span>
                    <span className="tabular-nums font-medium">{formatCurrencyShort(b.netAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Activity Feed */}
      {recentJobs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-700">AI Activity</h2>
            </div>
            <Link href="/documents" className="text-xs text-blue-600 hover:underline font-medium">View documents</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentJobs.map((job: any) => (
              <div key={job.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  job.status === 'COMPLETED' ? 'bg-green-500' :
                  job.status === 'FAILED' ? 'bg-red-500' :
                  job.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
                  'bg-slate-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 font-medium truncate">{humanize(job.agentType || job.type || 'Agent Job')}</p>
                  {job.document?.name && <p className="text-xs text-slate-400 truncate">{job.document.name}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    job.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>{humanize(job.status)}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{timeAgo(job.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
