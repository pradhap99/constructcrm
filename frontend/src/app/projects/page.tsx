'use client'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, User, CalendarDays, IndianRupee, Plus, FolderKanban, Bot, Loader2, CheckCircle2, LayoutGrid, Activity, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { projects, agentJobs } from '@/lib/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AgentState = 'idle' | 'running' | 'done' | 'failed'
type AgentType = 'reconciliation' | 'risk' | 'chase'

const AGENT_TYPES: { type: AgentType; label: string; desc: string }[] = [
  { type: 'reconciliation', label: 'Material Reconciliation', desc: 'Match received vs installed qty and flag gaps' },
  { type: 'risk',           label: 'Risk Assessment',         desc: 'Analyse schedule, cost, and compliance risk' },
  { type: 'chase',          label: 'Payment Chase',           desc: 'Draft follow-up letters for overdue bills' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  planning:  { label: 'Planning',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  on_hold:   { label: 'On Hold',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
}

function fmtCr(n: number | string) {
  const v = Number(n)
  if (isNaN(v)) return '₹0'
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  return `₹${v.toLocaleString('en-IN')}`
}

const BLANK = { name: '', project_code: '', client_name: '', site_address: '', city: '', state: '', budget_amount: '', start_date: '', expected_end_date: '', project_type: 'residential', status: 'planning' }

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'grid' | 'activity'>('grid')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({})
  const [agentResults, setAgentResults] = useState<Record<string, unknown>>({})
  const [resultModal, setResultModal] = useState<{ open: boolean; title: string; data: unknown }>({ open: false, title: '', data: null })

  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() })
  const items: any[] = (data?.data as any) ?? []
  const filtered = statusFilter === 'all' ? items : items.filter((p: any) => p.status === statusFilter)

  const createMutation = useMutation({
    mutationFn: (payload: any) => projects.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project created'); setShowModal(false); setForm(BLANK) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to create project'),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ ...form, budget_amount: Number(form.budget_amount) || 0, start_date: form.start_date || null, expected_end_date: form.expected_end_date || null })
  }

  const pollJob = useCallback(async (key: string, jobId: string) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await agentJobs.get(jobId)
        const job = res.data
        if (job.status === 'completed') {
          clearInterval(interval)
          setAgentStates(p => ({ ...p, [key]: 'done' }))
          setAgentResults(p => ({ ...p, [key]: job.output_data }))
        } else if (job.status === 'failed') {
          clearInterval(interval)
          setAgentStates(p => ({ ...p, [key]: 'failed' }))
          toast.error('Agent job failed')
        }
      } catch { /* ignore */ }
      if (attempts >= 30) clearInterval(interval)
    }, 2000)
  }, [])

  async function runAgent(projectId: string, type: AgentType) {
    const key = `${projectId}-${type}`
    setAgentStates(p => ({ ...p, [key]: 'running' }))
    try {
      const res = await agentJobs.create({ job_type: type, project_id: projectId })
      pollJob(key, (res.data as any).id)
    } catch {
      setAgentStates(p => ({ ...p, [key]: 'idle' }))
      toast.error('Failed to start agent')
    }
  }

  function agentState(projectId: string, type: AgentType): AgentState {
    return agentStates[`${projectId}-${type}`] ?? 'idle'
  }

  const totalBudget = items.reduce((s: number, p: any) => s + Number(p.budget_amount || 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500">{items.length} projects total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden text-sm">
            <button onClick={() => setActiveTab('grid')} className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors', activeTab === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
              <LayoutGrid className="w-4 h-4" /> Grid
            </button>
            <button onClick={() => setActiveTab('activity')} className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors', activeTab === 'activity' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
              <Activity className="w-4 h-4" /> AI Activity
            </button>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-sm">
            <Plus className="w-4 h-4 mr-1" /> New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: items.length, color: 'text-gray-900' },
          { label: 'Active', value: items.filter((p: any) => p.status === 'active').length, color: 'text-indigo-600' },
          { label: 'Total Budget', value: fmtCr(totalBudget), color: 'text-blue-600' },
          { label: 'Planning', value: items.filter((p: any) => p.status === 'planning').length, color: 'text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg border shadow-sm p-4">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className={cn('text-2xl font-bold mt-1', c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {activeTab === 'grid' && (
        <>
          <div className="flex flex-wrap gap-2">
            {['all','planning','active','on_hold','completed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-colors', statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>

          {isLoading && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="bg-white rounded-lg border h-56 animate-pulse" />)}</div>}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{items.length === 0 ? 'No projects yet. Create your first project.' : 'No projects match the filter.'}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project: any) => {
              const cfg = STATUS_CONFIG[project.status] ?? { label: project.status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
              return (
                <div key={project.id} className="bg-white rounded-lg border shadow-sm p-5 hover:shadow-md transition-shadow space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{project.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{project.project_code}</p>
                    </div>
                    <span className={cn('flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border', cfg.color)}>{cfg.label}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600"><Building2 className="w-4 h-4 text-gray-400" /><span>{project.client_name}</span></div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600"><User className="w-4 h-4 text-gray-400" /><span>{project.city}{project.state ? `, ${project.state}` : ''}</span></div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-gray-500"><IndianRupee className="w-3.5 h-3.5" /><span>Budget</span></div>
                    <span className="font-semibold text-gray-900">{fmtCr(project.budget_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t">
                    <div className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />
                      <span>{project.start_date ? formatDate(project.start_date, 'MMM yyyy') : '—'} → {project.expected_end_date ? formatDate(project.expected_end_date, 'MMM yyyy') : '—'}</span>
                    </div>
                    <span className="capitalize text-gray-400">{project.project_type}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Run AI agents per project — reconciliation, risk analysis, or payment chase.</p>
          {isLoading && <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>}
          {!isLoading && items.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No projects yet. Create a project first to run AI agents.</p>
            </div>
          )}
          {items.map((project: any) => (
            <div key={project.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', STATUS_CONFIG[project.status]?.color ?? 'bg-gray-100 text-gray-700 border-gray-200')}>
                    {STATUS_CONFIG[project.status]?.label ?? project.status}
                  </span>
                  <span className="font-semibold text-gray-900">{project.name}</span>
                  <span className="text-sm text-gray-400">{project.client_name}</span>
                </div>
                <span className="text-sm text-gray-500">{fmtCr(project.budget_amount)}</span>
              </div>
              <div className="divide-y">
                {AGENT_TYPES.map(agent => {
                  const state = agentState(project.id, agent.type)
                  return (
                    <div key={agent.type} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{agent.label}</p>
                        <p className="text-xs text-gray-400">{agent.desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {state === 'done' && (
                          <button onClick={() => setResultModal({ open: true, title: agent.label, data: agentResults[`${project.id}-${agent.type}`] })}
                            className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:underline">
                            <CheckCircle2 className="w-3.5 h-3.5" /> View Results
                          </button>
                        )}
                        {state === 'failed' && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
                        {state === 'running' && <span className="text-xs text-indigo-500 font-medium flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</span>}
                        <button onClick={() => runAgent(project.id, agent.type)} disabled={state === 'running'}
                          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            state === 'running' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700')}>
                          <Bot className="w-3.5 h-3.5" />
                          {state === 'done' ? 'Re-run' : 'Run Agent'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Project Name *</Label><Input value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} required /></div>
              <div className="space-y-1"><Label>Project Code *</Label><Input value={form.project_code} onChange={e => setForm(f => ({...f,project_code:e.target.value}))} placeholder="PRJ-001" required /></div>
              <div className="space-y-1"><Label>Client Name *</Label><Input value={form.client_name} onChange={e => setForm(f => ({...f,client_name:e.target.value}))} required /></div>
              <div className="space-y-1"><Label>Budget (₹)</Label><Input type="number" value={form.budget_amount} onChange={e => setForm(f => ({...f,budget_amount:e.target.value}))} placeholder="10000000" /></div>
              <div className="space-y-1 col-span-2"><Label>Site Address *</Label><Input value={form.site_address} onChange={e => setForm(f => ({...f,site_address:e.target.value}))} required /></div>
              <div className="space-y-1"><Label>City *</Label><Input value={form.city} onChange={e => setForm(f => ({...f,city:e.target.value}))} required /></div>
              <div className="space-y-1"><Label>State *</Label><Input value={form.state} onChange={e => setForm(f => ({...f,state:e.target.value}))} required /></div>
              <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({...f,start_date:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Expected End Date</Label><Input type="date" value={form.expected_end_date} onChange={e => setForm(f => ({...f,expected_end_date:e.target.value}))} /></div>
              <div className="space-y-1">
                <Label>Project Type</Label>
                <Select value={form.project_type} onValueChange={v => setForm(f => ({...f,project_type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['residential','commercial','industrial','infrastructure','mixed'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({...f,status:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['planning','active','on_hold','completed'].map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Creating…</> : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resultModal.open} onOpenChange={v => setResultModal(r => ({...r, open: v}))}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600" />{resultModal.title} — AI Results</DialogTitle></DialogHeader>
          <div className="pt-2">
            {resultModal.data
              ? <pre className="text-xs bg-gray-50 rounded-lg p-4 overflow-auto whitespace-pre-wrap font-mono">{JSON.stringify(resultModal.data, null, 2)}</pre>
              : <p className="text-gray-400 text-sm">No results available.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
