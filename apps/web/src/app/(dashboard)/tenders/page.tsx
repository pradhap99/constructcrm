'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrencyShort, formatDate, daysAgo } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { Plus, Calendar, X, Loader2, Briefcase, ChevronRight } from 'lucide-react';

const STAGES = [
  { key: 'EXPRESSION_OF_INTEREST', label: 'Expression of Interest', color: 'border-slate-300' },
  { key: 'SHORTLISTED',            label: 'Shortlisted',            color: 'border-blue-400' },
  { key: 'BID_SUBMITTED',          label: 'Bid Submitted',          color: 'border-purple-400' },
  { key: 'AWARDED',                label: 'Awarded',                color: 'border-green-400' },
  { key: 'LOST',                   label: 'Lost',                   color: 'border-red-300' },
];

const STAGE_NEXT: Record<string, string> = {
  EXPRESSION_OF_INTEREST: 'SHORTLISTED',
  SHORTLISTED: 'BID_SUBMITTED',
  BID_SUBMITTED: 'AWARDED',
};

const TYPE_COLOR: Record<string, string> = {
  Government: 'bg-blue-100 text-blue-700',
  Private:    'bg-purple-100 text-purple-700',
  PPP:        'bg-teal-100 text-teal-700',
};

export default function TendersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'Government', estimatedValue: '',
    submissionDate: '', referenceNumber: '', notes: '', clientName: '',
  });

  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: () => api.getTenders(),
  });

  const createMutation = useMutation({
    mutationFn: api.createTender,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenders'] });
      setShowModal(false);
      toast.success('Tender added to pipeline');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create tender'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateTender(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenders'] });
      toast.success('Tender stage updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const tendersByStage = STAGES.reduce((acc, s) => {
    acc[s.key] = (tenders as any[]).filter((t: any) => t.stage === s.key);
    return acc;
  }, {} as Record<string, any[]>);

  const totalPipeline = (tenders as any[])
    .filter((t: any) => !['LOST'].includes(t.stage))
    .reduce((s: number, t: any) => s + parseFloat(t.estimatedValue || 0), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tender Pipeline</h1>
          <p className="text-slate-500 text-sm mt-1">
            {(tenders as any[]).length} tenders tracked · {formatCurrencyShort(totalPipeline)} pipeline value
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Tender
        </button>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const cards = tendersByStage[stage.key] || [];
            return (
              <div key={stage.key} className="flex-shrink-0 w-64">
                {/* Column header */}
                <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${stage.color}`}>
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{stage.label}</span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {cards.map((tender: any) => {
                    const daysLeft = tender.submissionDate ? -daysAgo(tender.submissionDate) : null;
                    const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                    const nextStage = STAGE_NEXT[tender.stage];

                    return (
                      <div key={tender.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                        {/* Type badge + value */}
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[tender.type] || 'bg-slate-100 text-slate-600'}`}>
                            {tender.type}
                          </span>
                          {tender.estimatedValue && (
                            <span className="text-xs font-semibold text-slate-700 tabular-nums">
                              {formatCurrencyShort(tender.estimatedValue)}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2" title={tender.name}>
                          {tender.name}
                        </h3>
                        {tender.clientName && (
                          <p className="text-xs text-slate-400 mb-2">{tender.clientName}</p>
                        )}

                        {/* Due date */}
                        {tender.submissionDate && (
                          <div className={`flex items-center gap-1.5 text-xs mb-2 ${urgent ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                            <Calendar className="w-3 h-3" />
                            {daysLeft !== null && daysLeft >= 0
                              ? <span className={urgent ? 'bg-red-100 text-red-700 px-1.5 py-0.5 rounded' : ''}>{daysLeft}d left</span>
                              : <span>Due {formatDate(tender.submissionDate)}</span>
                            }
                          </div>
                        )}

                        {/* Win probability bar */}
                        {tender.winProbability != null && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${tender.winProbability > 70 ? 'bg-green-500' : tender.winProbability > 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                                style={{ width: `${tender.winProbability}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 shrink-0">{tender.winProbability}% win</span>
                          </div>
                        )}

                        {/* Move to next stage */}
                        {nextStage && (
                          <button
                            onClick={() => updateMutation.mutate({ id: tender.id, body: { stage: nextStage } })}
                            className="w-full text-xs py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 flex items-center justify-center gap-1 transition-colors"
                          >
                            Move forward <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add card */}
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-2.5 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add tender
                  </button>
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
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">New Tender</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tender Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="NHAI Package NH-48 Widening Ph 3"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Government</option>
                    <option>Private</option>
                    <option>PPP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Estimated Value (₹)</label>
                  <input
                    type="number"
                    value={form.estimatedValue}
                    onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
                    placeholder="250000000"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Submission Date</label>
                  <input
                    type="date"
                    value={form.submissionDate}
                    onChange={e => setForm(f => ({ ...f, submissionDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Reference No.</label>
                  <input
                    value={form.referenceNumber}
                    onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                    placeholder="NHAI/NH-48/2026"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Client / Authority</label>
                <input
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="NHAI, BBMP, Godrej Properties…"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Key scope, risks, competition notes…"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={createMutation.isPending || !form.name}
                onClick={() => createMutation.mutate({
                  ...form,
                  estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
                  stage: 'EXPRESSION_OF_INTEREST',
                })}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Add to Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
