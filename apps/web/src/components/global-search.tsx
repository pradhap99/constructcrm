'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, FolderKanban, FileText, Package, Receipt, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrencyShort, humanize } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'project' | 'document' | 'material' | 'bill';
  label: string;
  sublabel?: string;
  href: string;
}

const TYPE_ICON: Record<string, any> = {
  project: FolderKanban,
  document: FileText,
  material: Package,
  bill: Receipt,
};

const TYPE_COLOR: Record<string, string> = {
  project:  'text-blue-600 bg-blue-50',
  document: 'text-slate-600 bg-slate-100',
  material: 'text-green-600 bg-green-50',
  bill:     'text-purple-600 bg-purple-50',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.getProjects, enabled: open });
  const { data: documents = [] } = useQuery({ queryKey: ['documents'], queryFn: () => api.getDocuments(), enabled: open });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: () => api.getMaterials(), enabled: open });
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: () => api.getBills(), enabled: open });

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase().trim();

  const results: SearchResult[] = q
    ? [
        ...(projects as any[])
          .filter((p: any) => p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))
          .slice(0, 3)
          .map((p: any) => ({
            id: p.id, type: 'project' as const,
            label: p.name,
            sublabel: `${p.code} · ${formatCurrencyShort(p.contractValue)}`,
            href: `/projects/${p.id}`,
          })),
        ...(documents as any[])
          .filter((d: any) => d.name.toLowerCase().includes(q))
          .slice(0, 3)
          .map((d: any) => ({
            id: d.id, type: 'document' as const,
            label: d.name,
            sublabel: humanize(d.status),
            href: `/documents`,
          })),
        ...(materials as any[])
          .filter((m: any) => m.name.toLowerCase().includes(q) || (m.specification || '').toLowerCase().includes(q))
          .slice(0, 2)
          .map((m: any) => ({
            id: m.id, type: 'material' as const,
            label: m.name,
            sublabel: m.specification || m.unit,
            href: `/materials`,
          })),
        ...(bills as any[])
          .filter((b: any) => b.billNumber.toLowerCase().includes(q) || (b.project?.name || '').toLowerCase().includes(q))
          .slice(0, 2)
          .map((b: any) => ({
            id: b.id, type: 'bill' as const,
            label: b.billNumber,
            sublabel: `${b.project?.name || ''} · ${formatCurrencyShort(b.netAmount)}`,
            href: `/bills`,
          })),
      ]
    : [];

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[selected]) { navigate(results[selected].href); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selected]);

  if (!open) return null;

  const grouped: Record<string, SearchResult[]> = {};
  results.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search projects, documents, materials, bills…"
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-0.5 rounded hover:bg-slate-100">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-xs text-slate-500 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {q && results.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No results for "<span className="font-medium text-slate-600">{query}</span>"
            </div>
          ) : q ? (
            <div className="py-2">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {type === 'project' ? 'Projects' : type === 'document' ? 'Documents' : type === 'material' ? 'Materials' : 'Bills'}
                  </div>
                  {items.map(r => {
                    const Icon = TYPE_ICON[r.type];
                    const idx = results.indexOf(r);
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(r.href)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${idx === selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[r.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
                          {r.sublabel && <p className="text-xs text-slate-400 truncate">{r.sublabel}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              Start typing to search across your projects, documents, materials and bills
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
