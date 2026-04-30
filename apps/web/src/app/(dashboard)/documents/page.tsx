'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/utils';
import {
  Upload, FileText, CheckCircle2, Clock, AlertCircle,
  Loader2, X, Download, ChevronRight, Zap, Search,
  FileSpreadsheet, ScanLine, Brain, Table2,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  UPLOADED:   { label: 'Uploaded',   color: 'bg-slate-100 text-slate-600',  icon: Clock },
  QUEUED:     { label: 'Queued',     color: 'bg-slate-100 text-slate-600',  icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700',    icon: Loader2 },
  EXTRACTED:  { label: 'Extracted',  color: 'bg-purple-100 text-purple-700', icon: Brain },
  MAPPED:     { label: 'Mapped',     color: 'bg-amber-100 text-amber-700',  icon: Table2 },
  COMPLETED:  { label: 'Complete',   color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  FAILED:     { label: 'Failed',     color: 'bg-red-100 text-red-700',      icon: AlertCircle },
};

const PIPELINE_STAGES = [
  { key: 'QUEUED',     label: 'Intake',      icon: ScanLine,        desc: 'PDF conversion + OCR' },
  { key: 'PROCESSING', label: 'Extraction',  icon: Brain,           desc: 'Claude AI entity parsing' },
  { key: 'MAPPED',     label: 'Mapping',     icon: Table2,          desc: 'Template alignment' },
  { key: 'COMPLETED',  label: 'Export',      icon: FileSpreadsheet, desc: 'Excel generation' },
];

const stageIndex = (status: string) => {
  const order = ['UPLOADED','QUEUED','PROCESSING','EXTRACTED','MAPPED','COMPLETED','FAILED'];
  return order.indexOf(status);
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects });
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.getDocuments(),
    refetchInterval: 5000, // Poll every 5s while docs are processing
  });

  const handleUpload = async (file: File, projectId: string) => {
    if (!projectId) { setUploadError('Please select a project first'); return; }
    setUploading(true); setUploadError('');
    try {
      await api.uploadDocument(projectId, file, 'BOQ');
      qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const [selectedProject, setSelectedProject] = useState('');

  const filtered = (documents as any[]).filter((d: any) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file, selectedProject);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 text-sm mt-1">Upload BOQs, measurement books and tender documents for AI processing</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 mb-6 transition-all ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">Drop a document here or click to upload</p>
            <p className="text-slate-500 text-sm mt-0.5">PDF, Excel, Word · up to 50MB · BOQ, Measurement Book, Rate Analysis</p>
            {uploadError && <p className="text-red-600 text-sm mt-1">{uploadError}</p>}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select project…</option>
              {(projects as any[]).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !selectedProject}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading…' : 'Choose File'}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" className="hidden"
          accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, selectedProject); }} />
      </div>

      {/* Pipeline legend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">AI Processing Pipeline</p>
        <div className="flex items-center gap-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.key} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-1.5">
                  <stage.icon className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-xs font-medium text-slate-700">{stage.label}</span>
                <span className="text-xs text-slate-400 text-center">{stage.desc}</span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
      </div>

      {/* Documents list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <FileText className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No documents uploaded yet</p>
          <p className="text-slate-400 text-sm">Upload a BOQ or measurement book to start</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc: any) => {
            const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.QUEUED;
            const Icon = cfg.icon;
            const si = stageIndex(doc.status);
            const pipelineProgress = Math.min(100, Math.round((si / 6) * 100));

            return (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-slate-900 text-sm truncate">{doc.name}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${cfg.color}`}>
                        <Icon className={`w-3 h-3 ${doc.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {doc.type} · {timeAgo(doc.createdAt)}
                      {doc.uploadedBy && ` · ${doc.uploadedBy.name}`}
                    </p>

                    {/* Mini pipeline progress */}
                    {doc.status !== 'FAILED' && (
                      <div className="mt-3">
                        <div className="flex gap-1">
                          {PIPELINE_STAGES.map((stage, i) => (
                            <div key={stage.key} className={`h-1 rounded-full flex-1 transition-all ${
                              i < Math.ceil(si / 1.5)
                                ? doc.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'
                                : 'bg-slate-100'
                            }`} />
                          ))}
                        </div>
                      </div>
                    )}

                    {doc.status === 'FAILED' && doc.errorMessage && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{doc.errorMessage}</p>
                    )}

                    {doc.confidenceScores && (
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span>Confidence:</span>
                        <span className={`font-medium ${
                          doc.confidenceScores.overall >= 0.9 ? 'text-green-600' :
                          doc.confidenceScores.overall >= 0.7 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {Math.round(doc.confidenceScores.overall * 100)}% overall
                        </span>
                      </div>
                    )}
                  </div>

                  {doc.status === 'COMPLETED' && (
                    <button
                      onClick={async () => {
                        const { url } = await api.getDocumentDownloadUrl(doc.id);
                        window.open(url, '_blank');
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Excel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
